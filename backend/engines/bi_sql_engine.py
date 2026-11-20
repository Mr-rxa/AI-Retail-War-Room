"""
bi_sql_engine.py — In-Memory SQLite Analytics & Text-to-SQL Engine
Provides zero-setup, lightning-fast ad-hoc SQL querying over retail telemetry.
Supports active CSV upload sessions and rich demo retail databases.
Enforces read-only safety, row limits, schema inspection, and auto-charting.
"""

import os
import re
import time
import sqlite3
import pandas as pd
from typing import Dict, List, Any, Optional, Tuple
from backend.engines import session_store

# In-memory connections cache: {session_id or 'demo': sqlite3.Connection}
_SQL_CONNECTIONS: Dict[str, sqlite3.Connection] = {}

FORBIDDEN_SQL_PATTERNS = [
    r'\bdrop\b', r'\bdelete\b', r'\bupdate\b', r'\binsert\b', r'\balter\b',
    r'\bcreate\b', r'\btruncate\b', r'\battach\b', r'\bdetach\b', r'\bpragma\b',
    r'\bgrant\b', r'\brevoke\b', r'\bexecute\b', r'\bvacuum\b'
]

def _generate_synthetic_demo_tables() -> Dict[str, pd.DataFrame]:
    """Generates normalized demo tables matching the Olist retail schema."""
    import numpy as np

    np.random.seed(42)
    n_orders = 1200
    n_customers = 600

    states = ['SP', 'RJ', 'MG', 'RS', 'PR', 'SC', 'BA', 'DF', 'PE', 'CE']
    state_weights = [0.42, 0.14, 0.12, 0.08, 0.07, 0.05, 0.04, 0.03, 0.03, 0.02]
    categories = ['health_beauty', 'watches_gifts', 'bed_bath_table', 'sports_leisure', 
                  'computers_accessories', 'furniture_decor', 'telephony', 'auto', 'toys', 'garden_tools']
    payment_methods = ['credit_card', 'boleto', 'voucher', 'debit_card']
    pm_weights = [0.74, 0.19, 0.04, 0.03]

    # Customers
    cust_ids = [f"c_{i:05d}" for i in range(1, n_customers + 1)]
    cust_states = np.random.choice(states, size=n_customers, p=state_weights)
    cust_cities = [f"{st}_Capital" if np.random.rand() > 0.4 else f"{st}_Metro" for st in cust_states]
    
    customers_df = pd.DataFrame({
        "customer_id": cust_ids,
        "customer_unique_id": [f"uid_{i:05d}" for i in range(1, n_customers + 1)],
        "customer_city": cust_cities,
        "customer_state": cust_states
    })

    # Orders
    base_dates = pd.date_range(start="2017-06-01", end="2018-05-31", periods=n_orders)
    order_custs = np.random.choice(cust_ids, size=n_orders)
    order_ids = [f"ord_{i:06d}" for i in range(1, n_orders + 1)]

    orders_df = pd.DataFrame({
        "order_id": order_ids,
        "customer_id": order_custs,
        "order_status": "delivered",
        "order_purchase_timestamp": [d.strftime("%Y-%m-%d %H:%M:%S") for d in base_dates],
        "order_delivered_date": [(d + pd.Timedelta(days=int(np.random.gamma(4, 2)))).strftime("%Y-%m-%d %H:%M:%S") for d in base_dates]
    })

    # Products & Items
    prod_ids = [f"p_{i:04d}" for i in range(1, 151)]
    prod_cats = np.random.choice(categories, size=150)
    products_df = pd.DataFrame({
        "product_id": prod_ids,
        "product_category_name": prod_cats,
        "price_base": np.random.uniform(25.0, 350.0, size=150).round(2)
    })

    item_records = []
    payment_records = []

    for idx, ord_id in enumerate(order_ids):
        p_idx = np.random.randint(0, 150)
        p_id = prod_ids[p_idx]
        price = float(products_df.loc[p_idx, "price_base"])
        freight = round(float(np.random.uniform(12.0, 38.0)), 2)
        item_records.append({
            "order_id": ord_id,
            "order_item_id": 1,
            "product_id": p_id,
            "product_category": prod_cats[p_idx],
            "price": price,
            "freight_value": freight
        })
        pm = str(np.random.choice(payment_methods, p=pm_weights))
        payment_records.append({
            "order_id": ord_id,
            "payment_type": pm,
            "payment_value": round(price + freight, 2)
        })

    order_items_df = pd.DataFrame(item_records)
    payments_df = pd.DataFrame(payment_records)

    return {
        "customers": customers_df,
        "orders": orders_df,
        "order_items": order_items_df,
        "payments": payments_df,
        "products": products_df
    }

def get_or_create_connection(session_id: Optional[str] = None) -> sqlite3.Connection:
    """Retrieves or builds an in-memory SQLite DB for the given session."""
    key = session_id if session_id and session_store.has(session_id) else "demo"

    if key in _SQL_CONNECTIONS:
        return _SQL_CONNECTIONS[key]

    conn = sqlite3.connect(":memory:", check_same_thread=False)
    conn.row_factory = sqlite3.Row

    if key != "demo" and session_store.has(session_id):
        # Build tables from uploaded session normalized DataFrame
        entry = session_store.get(session_id)
        df = entry["df"]
        
        # Primary retail table
        df.to_sql("retail_sales", conn, index=False, if_exists="replace")
        
        # Sub-views for relational queries
        if "customer_id" in df.columns:
            cust_cols = [c for c in ["customer_id", "region"] if c in df.columns]
            df[cust_cols].drop_duplicates().to_sql("customers", conn, index=False, if_exists="replace")
        
        if "product_category" in df.columns:
            df[["product_category"]].drop_duplicates().to_sql("categories", conn, index=False, if_exists="replace")
            
        # Create helper index
        cursor = conn.cursor()
        try:
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_sales_date ON retail_sales(order_date);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_sales_cust ON retail_sales(customer_id);")
        except Exception:
            pass
    else:
        # Build from synthetic demo relational schema
        demo_tables = _generate_synthetic_demo_tables()
        for tname, tdf in demo_tables.items():
            tdf.to_sql(tname, conn, index=False, if_exists="replace")

        # Flat unified view for easy queries
        cursor = conn.cursor()
        cursor.execute("""
            CREATE VIEW IF NOT EXISTS v_retail_sales AS
            SELECT 
                o.order_id,
                o.customer_id,
                c.customer_city,
                c.customer_state,
                o.order_purchase_timestamp AS order_date,
                o.order_delivered_date AS delivery_date,
                oi.product_category,
                oi.price,
                oi.freight_value,
                p.payment_type,
                p.payment_value
            FROM orders o
            JOIN customers c ON o.customer_id = c.customer_id
            JOIN order_items oi ON o.order_id = oi.order_id
            JOIN payments p ON o.order_id = p.order_id;
        """)

    _SQL_CONNECTIONS[key] = conn
    return conn

def get_database_schema(session_id: Optional[str] = None) -> Dict[str, Any]:
    """Inspects all tables, views, and columns in the session database."""
    conn = get_or_create_connection(session_id)
    cursor = conn.cursor()

    cursor.execute("""
        SELECT name, type FROM sqlite_master 
        WHERE type IN ('table', 'view') AND name NOT LIKE 'sqlite_%';
    """)
    items = cursor.fetchall()

    schema_info = []
    for item in items:
        name = item["name"]
        item_type = item["type"]
        
        # Get column info
        cursor.execute(f"PRAGMA table_info('{name}');")
        cols = [{"name": c["name"], "type": c["type"] or "TEXT"} for c in cursor.fetchall()]

        # Get row count estimate
        try:
            cursor.execute(f"SELECT COUNT(*) AS cnt FROM '{name}';")
            row_count = cursor.fetchone()["cnt"]
        except Exception:
            row_count = 0

        schema_info.append({
            "name": name,
            "type": item_type,
            "columns": cols,
            "row_count": row_count
        })

    return {
        "success": True,
        "tables": schema_info,
        "is_demo": (session_id is None or not session_store.has(session_id))
    }

def execute_safe_query(sql_query: str, session_id: Optional[str] = None, max_rows: int = 1000) -> Dict[str, Any]:
    """
    Validates and executes a read-only SQL query against the in-memory SQLite engine.
    Returns structured results, execution duration, and chart recommendations.
    """
    clean_sql = (sql_query or "").strip()
    if not clean_sql:
        return {"success": False, "error": "Query cannot be empty."}

    # Safety checks: ensure it is read-only
    lower_sql = clean_sql.lower()
    for forbidden in FORBIDDEN_SQL_PATTERNS:
        if re.search(forbidden, lower_sql):
            return {
                "success": False, 
                "error": f"Security violation: Statement contains restricted keyword '{forbidden.strip(r'\b')}'. Only read-only SELECT queries are permitted."
            }

    if not (lower_sql.startswith("select") or lower_sql.startswith("with") or lower_sql.startswith("explain")):
        return {"success": False, "error": "Only SELECT or WITH CTE queries are allowed."}

    conn = get_or_create_connection(session_id)
    cursor = conn.cursor()

    start_time = time.perf_counter()
    try:
        cursor.execute(clean_sql)
        description = cursor.description
        if not description:
            return {"success": True, "columns": [], "rows": [], "row_count": 0, "execution_ms": 0}

        columns = [d[0] for d in description]
        raw_rows = cursor.fetchmany(max_rows + 1)
        execution_ms = round((time.perf_counter() - start_time) * 1000, 2)

        has_more = len(raw_rows) > max_rows
        rows_to_return = raw_rows[:max_rows]

        # Convert to serializable dicts
        formatted_rows = [
            {columns[i]: row[i] for i in range(len(columns))}
            for row in rows_to_return
        ]

        # Automatic Chart Recommendation
        suggested_chart = _recommend_chart_type(columns, formatted_rows)

        return {
            "success": True,
            "columns": columns,
            "rows": formatted_rows,
            "row_count": len(formatted_rows),
            "has_more": has_more,
            "execution_ms": execution_ms,
            "suggested_chart": suggested_chart
        }

    except sqlite3.Error as e:
        return {
            "success": False,
            "error": f"SQL Execution Error: {str(e)}",
            "execution_ms": round((time.perf_counter() - start_time) * 1000, 2)
        }

def _recommend_chart_type(columns: List[str], rows: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """Analyzes query result structure and recommends Chart.js configuration."""
    if not rows or len(columns) < 2:
        return None

    # Identify string/category columns vs numeric columns
    first_row = rows[0]
    num_cols = []
    str_cols = []

    for col in columns:
        val = first_row.get(col)
        if isinstance(val, (int, float)):
            num_cols.append(col)
        else:
            str_cols.append(col)

    if not num_cols or not str_cols:
        return None

    x_col = str_cols[0]
    y_col = num_cols[0]

    # Time series check
    is_time = any(w in x_col.lower() for w in ['month', 'date', 'year', 'day', 'time'])
    chart_type = "line" if is_time else ("doughnut" if len(rows) <= 5 else "bar")

    return {
        "type": chart_type,
        "x_axis": x_col,
        "y_axis": y_col,
        "labels": [str(r.get(x_col, "")) for r in rows[:15]],
        "data": [r.get(y_col, 0) for r in rows[:15]]
    }

def text_to_sql_copilot(prompt: str, session_id: Optional[str] = None) -> Dict[str, Any]:
    """Translates user natural language into safe SQLite queries."""
    clean_prompt = (prompt or "").strip()
    if not clean_prompt:
        return {"success": False, "error": "Prompt cannot be empty."}

    # Fetch schema context
    schema_info = get_database_schema(session_id)
    tables_summary = "\n".join([
        f"- Table: {t['name']} (Columns: {', '.join([c['name'] for c in t['columns']])})"
        for t in schema_info.get("tables", [])
    ])

    gemini_key = os.getenv("GEMINI_API_KEY")
    generated_sql = None

    if gemini_key and len(gemini_key) > 5:
        system_instruction = f"""
You are an expert SQL Data Analyst in the AI Retail War Room.
Convert the user request into an optimal, accurate SQLite SELECT query.
Database Schema:
{tables_summary}

Rules:
1. ONLY return the raw SQL query. Do not wrap in markdown quotes or backticks.
2. Must be a valid read-only SELECT or WITH statement.
3. Use LIMIT 50 unless user specifies otherwise.
4. User Question: "{clean_prompt}"
"""
        try:
            from google import genai
            client = genai.Client(api_key=gemini_key)
            for m in ['gemini-3.8-flash', 'gemini-3.5-flash']:
                try:
                    res = client.models.generate_content(model=m, contents=system_instruction)
                    if res and res.text:
                        raw = res.text.strip()
                        raw = re.sub(r'^```sql\s*', '', raw)
                        raw = re.sub(r'^```\s*', '', raw)
                        raw = re.sub(r'```$', '', raw).strip()
                        generated_sql = raw
                        break
                except Exception:
                    pass
        except Exception:
            pass

    # Fallback to rule-based template if LLM unavailable or timed out
    if not generated_sql:
        lower_p = clean_prompt.lower()
        if "state" in lower_p or "region" in lower_p:
            generated_sql = "SELECT customer_state, COUNT(order_id) AS orders, ROUND(SUM(payment_value), 2) AS total_revenue FROM v_retail_sales GROUP BY customer_state ORDER BY total_revenue DESC LIMIT 10;"
        elif "categor" in lower_p or "product" in lower_p:
            generated_sql = "SELECT product_category, COUNT(order_id) AS orders, ROUND(SUM(price), 2) AS gross_sales, ROUND(AVG(price), 2) AS avg_price FROM v_retail_sales GROUP BY product_category ORDER BY gross_sales DESC LIMIT 10;"
        elif "customer" in lower_p or "loyal" in lower_p or "buyer" in lower_p:
            generated_sql = "SELECT customer_id, customer_city, customer_state, COUNT(order_id) AS order_count, ROUND(SUM(payment_value), 2) AS lifetime_value FROM v_retail_sales GROUP BY customer_id ORDER BY lifetime_value DESC LIMIT 15;"
        elif "month" in lower_p or "trend" in lower_p or "revenue" in lower_p:
            generated_sql = "SELECT substr(order_date, 1, 7) AS month, COUNT(order_id) AS orders, ROUND(SUM(payment_value), 2) AS monthly_revenue FROM v_retail_sales GROUP BY month ORDER BY month ASC LIMIT 12;"
        elif "payment" in lower_p:
            generated_sql = "SELECT payment_type, COUNT(order_id) AS transaction_count, ROUND(SUM(payment_value), 2) AS total_amount FROM v_retail_sales GROUP BY payment_type ORDER BY total_amount DESC;"
        else:
            generated_sql = "SELECT order_id, customer_state, product_category, price, payment_value, order_date FROM v_retail_sales ORDER BY order_date DESC LIMIT 20;"

    return {
        "success": True,
        "sql": generated_sql,
        "prompt": clean_prompt
    }

def get_curated_bi_templates() -> List[Dict[str, str]]:
    """Returns vetted retail analytical queries for 1-click exploration."""
    return [
        {
            "title": "Top 10 High LTV Customers",
            "category": "Customer Intelligence",
            "sql": "SELECT customer_id, customer_city, customer_state, COUNT(order_id) AS orders, ROUND(SUM(payment_value), 2) AS lifetime_spend FROM v_retail_sales GROUP BY customer_id HAVING orders >= 1 ORDER BY lifetime_spend DESC LIMIT 10;"
        },
        {
            "title": "Category Gross Margin & Volume",
            "category": "Merchandising",
            "sql": "SELECT product_category, COUNT(order_id) AS total_orders, ROUND(SUM(price), 2) AS gross_revenue, ROUND(AVG(freight_value), 2) AS avg_freight FROM v_retail_sales GROUP BY product_category ORDER BY gross_revenue DESC LIMIT 10;"
        },
        {
            "title": "Territory Performance Matrix",
            "category": "Regional BI",
            "sql": "SELECT customer_state, COUNT(DISTINCT customer_id) AS buyers, COUNT(order_id) AS orders, ROUND(SUM(payment_value), 2) AS revenue, ROUND(AVG(payment_value), 2) AS aov FROM v_retail_sales GROUP BY customer_state ORDER BY revenue DESC LIMIT 10;"
        },
        {
            "title": "Monthly Revenue & Demand Velocity",
            "category": "Financial Trends",
            "sql": "SELECT substr(order_date, 1, 7) AS month, COUNT(order_id) AS orders, ROUND(SUM(payment_value), 2) AS revenue, ROUND(AVG(price), 2) AS avg_item_price FROM v_retail_sales GROUP BY month ORDER BY month ASC;"
        },
        {
            "title": "Payment Method Breakdown",
            "category": "Payments",
            "sql": "SELECT payment_type, COUNT(order_id) AS total_transactions, ROUND(SUM(payment_value), 2) AS total_volume, ROUND(AVG(payment_value), 2) AS avg_ticket FROM v_retail_sales GROUP BY payment_type ORDER BY total_volume DESC;"
        }
    ]
