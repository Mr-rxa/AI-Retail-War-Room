from database import execute_query


def sales_history():

    query = """

    SELECT

        DATE(order_purchase_timestamp) AS ds,

        ROUND(
            SUM(payment_value),
            2
        ) AS y

    FROM orders o

    JOIN order_payments p

        ON o.order_id = p.order_id

    GROUP BY DATE(order_purchase_timestamp)

    ORDER BY ds

    """

    return execute_query(query)