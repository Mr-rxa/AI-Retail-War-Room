from backend.database import execute_query, execute_one


def revenue_growth():

    query = """
    WITH monthly_sales AS (

        SELECT

            DATE_TRUNC('month', o.order_purchase_timestamp) AS month,

            SUM(op.payment_value) AS revenue

        FROM orders o

        JOIN order_payments op
            ON o.order_id = op.order_id

        GROUP BY 1

    )

    SELECT

        month,

        ROUND(revenue,2) AS revenue,

        ROUND(
            LAG(revenue) OVER (ORDER BY month),
            2
        ) AS previous_revenue,

        ROUND(

            (
                revenue -
                LAG(revenue) OVER (ORDER BY month)
            )

            /

            NULLIF(
                LAG(revenue) OVER (ORDER BY month),
                0
            )

            *100,

            2

        ) AS growth_percent

    FROM monthly_sales

    WHERE month >= DATE '2017-06-01'

    ORDER BY month;
    """

    return execute_query(query)
def monthly_revenue():

    query = """

    SELECT

        DATE_TRUNC(
            'month',
            o.order_purchase_timestamp
        ) AS month,

        ROUND(
            SUM(op.payment_value),
            2
        ) AS revenue

    FROM orders o

    JOIN order_payments op
        ON o.order_id = op.order_id

    GROUP BY 1

    ORDER BY 1

    """

    return execute_query(query)
def monthly_orders():

    query = """

    SELECT

        DATE_TRUNC(
            'month',
            order_purchase_timestamp
        ) AS month,

        COUNT(order_id) AS orders

    FROM orders

    GROUP BY 1

    ORDER BY 1

    """

    return execute_query(query)
def top_categories(limit=10):

    query = """

    SELECT

        COALESCE(
            ct.product_category_name_english,
            p.product_category_name
        ) AS category,

        ROUND(SUM(oi.price),2) AS revenue,

        COUNT(*) AS orders

    FROM order_items oi

    JOIN products p
        ON oi.product_id = p.product_id

    LEFT JOIN category_translation ct
        ON p.product_category_name = ct.product_category_name

    GROUP BY
        COALESCE(
            ct.product_category_name_english,
            p.product_category_name
        )

    ORDER BY revenue DESC

    LIMIT :limit

    """

    return execute_query(query, {"limit": limit})
def top_states(limit=10):

    query = """

    SELECT

        c.customer_state,

        ROUND(

            SUM(op.payment_value),

            2

        ) revenue,

        COUNT(DISTINCT o.order_id) orders

    FROM customers c

    JOIN orders o

        ON c.customer_id=o.customer_id

    JOIN order_payments op

        ON o.order_id=op.order_id

    GROUP BY customer_state

    ORDER BY revenue DESC

    LIMIT :limit

    """

    return execute_query(

        query,

        {"limit":limit}

    )
def payment_breakdown():

    query = """

    SELECT

        payment_type,

        COUNT(*) total,

        ROUND(

            SUM(payment_value),

            2

        ) revenue

    FROM order_payments

    GROUP BY payment_type

    ORDER BY revenue DESC

    """

    return execute_query(query)
def top_products(limit=10):

    query = """

    SELECT

    LEFT(oi.product_id,10) AS product,

    COALESCE(
        ct.product_category_name_english,
        p.product_category_name
    ) AS category,

    COUNT(*) AS sold,

    ROUND(
        SUM(oi.price),
        2
    ) AS revenue

FROM order_items oi

JOIN products p
ON oi.product_id = p.product_id

LEFT JOIN category_translation ct
ON p.product_category_name =
ct.product_category_name

GROUP BY

LEFT(oi.product_id,10),

COALESCE(
    ct.product_category_name_english,
    p.product_category_name
)

ORDER BY revenue DESC

LIMIT :limit
    """

    return execute_query(

        query,

        {"limit":limit}

    )
def repeat_customers():

    query = """

    SELECT

        COUNT(*) AS repeat_customers

    FROM (

        SELECT

            c.customer_unique_id,

            COUNT(*) AS total_orders

        FROM orders o

        JOIN customers c

            ON o.customer_id = c.customer_id

        GROUP BY c.customer_unique_id

        HAVING COUNT(*) > 1

    ) t

    """

    return execute_one(query)
def customer_retention():

    query = """

    WITH customer_orders AS (

        SELECT

            c.customer_unique_id,

            COUNT(*) AS orders

        FROM orders o

        JOIN customers c

            ON o.customer_id = c.customer_id

        GROUP BY c.customer_unique_id

    )

    SELECT

        ROUND(AVG(orders),2) AS avg_orders,

        MAX(orders) AS max_orders,

        MIN(orders) AS min_orders,

        SUM(
            CASE
                WHEN orders > 1 THEN 1
                ELSE 0
            END
        ) AS repeat_customers,

        COUNT(*) AS total_customers

    FROM customer_orders

    """

    return execute_one(query)
def new_customers_monthly():

    query = """

    SELECT

        DATE_TRUNC('month', first_order) AS month,

        COUNT(*) AS new_customers

    FROM (

        SELECT

            customer_id,

            MIN(order_purchase_timestamp) AS first_order

        FROM orders

        GROUP BY customer_id

    ) first_orders

    GROUP BY DATE_TRUNC('month', first_order)

    ORDER BY DATE_TRUNC('month', first_order)

    """

    return execute_query(query)
def revenue_by_weekday():

    query = """

    SELECT

        TRIM(
            TO_CHAR(
                o.order_purchase_timestamp,
                'Day'
            )
        ) AS weekday,

        ROUND(
            SUM(p.payment_value),
            2
        ) AS revenue

    FROM orders o

    JOIN order_payments p
        ON o.order_id = p.order_id

    GROUP BY

        TRIM(
            TO_CHAR(
                o.order_purchase_timestamp,
                'Day'
            )
        )

    ORDER BY revenue DESC

    """

    return execute_query(query)
def sales_by_hour():

    query = """

    SELECT

        EXTRACT(
            HOUR
            FROM order_purchase_timestamp
        ) AS hour,

        COUNT(*) AS orders

    FROM orders

    GROUP BY

        EXTRACT(
            HOUR
            FROM order_purchase_timestamp
        )

    ORDER BY hour

    """

    return execute_query(query)
def delivery_performance():

    query="""

    SELECT

ROUND(

AVG(

EXTRACT(

EPOCH FROM (

order_delivered_customer_date -
order_purchase_timestamp

)

)/86400

),

2

) AS avg_delivery_days

FROM orders

WHERE order_delivered_customer_date IS NOT NULL;

    """

    return execute_one(query)
def average_order_value():

    query = """

    SELECT

        ROUND(

            SUM(payment_value)

            /

            COUNT(DISTINCT order_id),

            2

        ) AS average_order_value

    FROM order_payments

    """

    return execute_one(query)


def repeat_vs_new_customers_monthly():

    query = """

    WITH customer_first_order AS (

        SELECT

            c.customer_unique_id,

            DATE_TRUNC(
                'month',
                MIN(o.order_purchase_timestamp)
            ) AS first_month

        FROM orders o

        JOIN customers c
            ON o.customer_id = c.customer_id

        GROUP BY c.customer_unique_id
    ),

    monthly_customers AS (

        SELECT

            DATE_TRUNC(
                'month',
                o.order_purchase_timestamp
            ) AS month,

            c.customer_unique_id,

            cfo.first_month

        FROM orders o

        JOIN customers c
            ON o.customer_id = c.customer_id

        JOIN customer_first_order cfo
            ON c.customer_unique_id = cfo.customer_unique_id

        GROUP BY 1, 2, 3
    )

    SELECT

        month,

        COUNT(*) FILTER (
            WHERE month = first_month
        ) AS new_customers,

        COUNT(*) FILTER (
            WHERE month > first_month
        ) AS repeat_customers,

        COUNT(*) AS total_customers

    FROM monthly_customers

    GROUP BY month

    ORDER BY month

    """

    return execute_query(query)


def customer_segments():

    query = """

    WITH latest_purchase AS (

        SELECT

            MAX(order_purchase_timestamp) AS max_purchase

        FROM orders
    ),

    customer_stats AS (

        SELECT

            c.customer_unique_id,

            c.customer_state,

            COUNT(DISTINCT o.order_id) AS total_orders,

            ROUND(
                SUM(op.payment_value),
                2
            ) AS total_revenue,

            ROUND(
                EXTRACT(
                    DAY FROM (
                        lp.max_purchase - MAX(o.order_purchase_timestamp)
                    )
                ),
                0
            ) AS recency_days

        FROM customers c

        JOIN orders o
            ON c.customer_id = o.customer_id

        JOIN order_payments op
            ON o.order_id = op.order_id

        CROSS JOIN latest_purchase lp

        GROUP BY
            c.customer_unique_id,
            c.customer_state,
            lp.max_purchase
    ),

    classified AS (

        SELECT

            *,

            CASE
                WHEN recency_days >= 180 THEN 'Inactive'
                WHEN recency_days >= 120 THEN 'At Risk'
                WHEN total_revenue >= 1000 OR total_orders >= 5 THEN 'High Value'
                ELSE 'Regular'
            END AS segment

        FROM customer_stats
    )

    SELECT

        segment,

        COUNT(*) AS customers,

        ROUND(
            SUM(total_revenue),
            2
        ) AS revenue,

        ROUND(
            AVG(total_orders),
            2
        ) AS average_orders,

        ROUND(
            AVG(recency_days),
            0
        ) AS average_recency_days

    FROM classified

    GROUP BY segment

    ORDER BY
        CASE segment
            WHEN 'High Value' THEN 1
            WHEN 'Regular' THEN 2
            WHEN 'At Risk' THEN 3
            ELSE 4
        END

    """

    return execute_query(query)


def average_days_between_orders():

    query = """

    WITH customer_order_gaps AS (

        SELECT

            c.customer_unique_id,

            EXTRACT(
                DAY FROM (
                    o.order_purchase_timestamp
                    -
                    LAG(o.order_purchase_timestamp) OVER (
                        PARTITION BY c.customer_unique_id
                        ORDER BY o.order_purchase_timestamp
                    )
                )
            ) AS gap_days

        FROM orders o

        JOIN customers c
            ON o.customer_id = c.customer_id
    )

    SELECT

        ROUND(
            AVG(gap_days),
            2
        ) AS avg_days_between_orders

    FROM customer_order_gaps

    WHERE gap_days IS NOT NULL

    """

    return execute_one(query)


def risky_customer_regions(limit=8):

    query = """

    WITH latest_purchase AS (

        SELECT

            MAX(order_purchase_timestamp) AS max_purchase

        FROM orders
    ),

    customer_stats AS (

        SELECT

            c.customer_unique_id,

            c.customer_state,

            COUNT(DISTINCT o.order_id) AS total_orders,

            ROUND(
                SUM(op.payment_value),
                2
            ) AS total_revenue,

            ROUND(
                EXTRACT(
                    DAY FROM (
                        lp.max_purchase - MAX(o.order_purchase_timestamp)
                    )
                ),
                0
            ) AS recency_days

        FROM customers c

        JOIN orders o
            ON c.customer_id = o.customer_id

        JOIN order_payments op
            ON o.order_id = op.order_id

        CROSS JOIN latest_purchase lp

        GROUP BY
            c.customer_unique_id,
            c.customer_state,
            lp.max_purchase
    )

    SELECT

        customer_state,

        COUNT(*) AS customers,

        SUM(
            CASE
                WHEN recency_days >= 120 THEN 1
                ELSE 0
            END
        ) AS risky_customers,

        ROUND(
            (
                SUM(
                    CASE
                        WHEN recency_days >= 120 THEN 1
                        ELSE 0
                    END
                )::numeric
                /
                NULLIF(COUNT(*), 0)
            ) * 100,
            2
        ) AS risk_rate,

        ROUND(
            SUM(
                CASE
                    WHEN recency_days >= 120 THEN total_revenue
                    ELSE 0
                END
            ),
            2
        ) AS revenue_at_risk

    FROM customer_stats

    GROUP BY customer_state

    HAVING COUNT(*) >= 20

    ORDER BY risk_rate DESC, risky_customers DESC

    LIMIT :limit

    """

    return execute_query(query, {"limit": limit})

