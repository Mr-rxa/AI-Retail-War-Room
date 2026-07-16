import os
import json
import time

from dotenv import load_dotenv
from google import genai

# from services.forecast_service import forecast_sales

load_dotenv()

client = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY")
)

MODEL = "gemini-2.5-flash"


def business_advisor(analytics):

    # forecast = forecast_sales(30)

    summary = {

        "business_health": analytics["business_health"],

        "forecast_summary": analytics.get("forecast_summary", {}),

        "average_order_value": analytics["average_order_value"],

        "delivery_performance": analytics["delivery_performance"],

        "customer_retention": analytics["customer_retention"],

        "top_categories": analytics["top_categories"][:3],

        "top_states": analytics["top_states"][:3],

        "payment_breakdown": analytics["payment_breakdown"],

        "recommendations": analytics["recommendations"],

        "anomalies": analytics["anomalies"]

    }

    prompt = f"""
You are a Senior Retail Business Intelligence Consultant.

Write ONLY in English.

Use Brazilian Real (R$).

The last months of the dataset may be incomplete.
Do not interpret incomplete months as business failure.

Below is the business summary.

{json.dumps(summary, indent=2, default=str)}

Return a professional management report.

Use exactly these headings.

# Executive Dashboard

Include:

- Business Health Score
- Revenue Trend
- Forecast Trend
- Forecast Growth
- Repeat Customer Rate
- Average Order Value
- Delivery Performance

# Executive Summary

# Business Health

# Key Insights

# Risks

# Opportunities

# Strategic Recommendations

# Next 30-Day Action Plan

Rules

• No repeated paragraphs.

• No duplicated sections.

• Maximum 3-5 bullets per section.

• Mention anomalies.

• Mention forecast.

• Mention business health breakdown.

Write like a McKinsey consultant.
"""

    retries = 3

    last_error = None

    for attempt in range(retries):

        try:

            response = client.models.generate_content(

                model=MODEL,

                contents=prompt

            )

            return response.text

        except Exception as e:

            last_error = e

            if attempt < retries - 1:

                time.sleep(2)

            else:

                return f"""
# Executive Summary

The AI Business Advisor is temporarily unavailable.

Reason

{last_error}

Business analytics remain fully operational.

Please try generating the report again shortly.
"""
