from backend.database import execute_one, execute_query


def build_where(filters):
    conditions = []
    params = {}

    if filters.get("year"):
        conditions.append(
            "EXTRACT(YEAR FROM o.order_purchase_timestamp) = :year"
        )
        params["year"] = int(filters["year"])

    if filters.get("state"):
        conditions.append(
            "c.customer_state = :state"
        )
        params["state"] = filters["state"]

    if filters.get("payment"):
        conditions.append(
            "op.payment_type = :payment"
        )
        params["payment"] = filters["payment"]

    where = ""

    if conditions:
        where = "WHERE " + " AND ".join(conditions)

    return where, params


# ======================================================


def fetch_kpis(filters):

    where, params = build_where(filters)

    query = f"""
    SELECT

        COALESCE(ROUND(SUM(op.payment_value),2), 0) AS revenue,

        COUNT(DISTINCT o.order_id) AS orders,

        COALESCE(ROUND(
            COALESCE(SUM(op.payment_value), 0)
            /
            NULLIF(COUNT(DISTINCT o.order_id), 0),
            2
        ), 0) AS average_order_value,

        COUNT(DISTINCT c.customer_id) AS customers

    FROM orders o

    JOIN customers c
    ON o.customer_id=c.customer_id

    JOIN order_payments op
    ON o.order_id=op.order_id

    {where}
    """

    return execute_one(query, params)


# ======================================================


def fetch_monthly_sales(filters):

    where, params = build_where(filters)

    query = f"""
    SELECT

        TO_CHAR(
            DATE_TRUNC(
                'month',
                o.order_purchase_timestamp
            ),
            'YYYY-MM'
        ) AS month,

        ROUND(
            SUM(op.payment_value),
            2
        ) AS revenue

    FROM orders o

    JOIN customers c
    ON o.customer_id=c.customer_id

    JOIN order_payments op
    ON o.order_id=op.order_id

    {where}

    GROUP BY 1

    ORDER BY 1
    """

    return execute_query(query, params)


# ======================================================


def fetch_top_categories(filters):

    where, params = build_where(filters)

    query = f"""
    SELECT

        COALESCE(
            ct.product_category_name_english,
            p.product_category_name
        ) AS category,

        ROUND(
            SUM(oi.price),
            2
        ) AS revenue,

        COUNT(DISTINCT o.order_id) AS orders

    FROM order_items oi

    JOIN products p
    ON oi.product_id=p.product_id

    LEFT JOIN category_translation ct
    ON p.product_category_name=
       ct.product_category_name

    JOIN orders o
    ON oi.order_id=o.order_id

    JOIN customers c
    ON o.customer_id=c.customer_id

    JOIN order_payments op
    ON o.order_id=op.order_id

    {where}

    GROUP BY category

    ORDER BY revenue DESC

    LIMIT 10
    """

    return execute_query(query, params)


# ======================================================


def fetch_payment_types(filters):

    where, params = build_where(filters)

    query = f"""
    SELECT

        op.payment_type,

        COUNT(*) AS total,

        ROUND(
            SUM(op.payment_value),
            2
        ) AS revenue

    FROM order_payments op

    JOIN orders o
    ON op.order_id=o.order_id

    JOIN customers c
    ON o.customer_id=c.customer_id

    {where}

    GROUP BY op.payment_type

    ORDER BY total DESC
    """

    return execute_query(query, params)


# ======================================================


def fetch_state_sales(filters):

    where, params = build_where(filters)

    query = f"""
    SELECT

        c.customer_state AS customer_state,

        ROUND(
            SUM(op.payment_value),
            2
        ) AS revenue,

        COUNT(DISTINCT o.order_id) AS orders

    FROM customers c

    JOIN orders o
    ON c.customer_id=o.customer_id

    JOIN order_payments op
    ON o.order_id=op.order_id

    {where}

    GROUP BY c.customer_state

    ORDER BY revenue DESC
    """

    return execute_query(query, params)


# ======================================================


def fetch_filter_options():

    years_query = """
    SELECT DISTINCT

        EXTRACT(YEAR FROM order_purchase_timestamp)::INT AS year

    FROM orders

    WHERE order_purchase_timestamp IS NOT NULL

    ORDER BY year
    """

    states_query = """
    SELECT

        c.customer_state,

        COUNT(DISTINCT o.order_id) AS orders

    FROM customers c

    JOIN orders o
    ON c.customer_id=o.customer_id

    WHERE c.customer_state IS NOT NULL

    GROUP BY c.customer_state

    ORDER BY orders DESC, c.customer_state
    """

    payments_query = """
    SELECT

        payment_type,

        COUNT(*) AS total

    FROM order_payments

    WHERE payment_type IS NOT NULL

    GROUP BY payment_type

    ORDER BY total DESC, payment_type
    """

    return {
        "years": execute_query(years_query),
        "states": execute_query(states_query),
        "payments": execute_query(payments_query)
    }
