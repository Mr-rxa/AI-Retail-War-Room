"""
scenario_service.py — What-If Strategic Simulation Engine
Simulates price elasticity, marketing spend lift, regional expansion, and retention deflection.
"""
from backend.services.dashboard_service import get_dashboard
from backend.services.forecast_service import forecast_sales

def simulate_scenario(params, session_id=None, filters=None):
    price_change = float(params.get("price_change_pct", 0)) / 100.0
    marketing_boost = float(params.get("marketing_boost_pct", 0)) / 100.0
    churn_reduction = float(params.get("churn_reduction_pct", 0)) / 100.0
    new_stores = int(params.get("store_expansion_count", 0))

    # Baseline data
    dash = get_dashboard(filters=filters, session_id=session_id)
    kpis = dash.get("kpis", {})
    base_rev = kpis.get("revenue", 1000000)
    base_orders = kpis.get("orders", 10000)
    base_aov = kpis.get("average_order_value", 100)

    # Elasticity & lift equations
    # Price elasticity of demand (retail average: -1.35)
    demand_elasticity = -1.35
    volume_change_from_price = price_change * demand_elasticity
    
    # Marketing volume lift (diminishing return model)
    volume_change_from_marketing = marketing_boost * 0.65
    
    # Churn reduction repeat order lift
    volume_change_from_retention = churn_reduction * 0.40
    
    # Store expansion lift (approx 3.5% lift per new regional flagship)
    volume_change_from_stores = (new_stores * 0.035)

    total_volume_mult = max(0.2, 1.0 + volume_change_from_price + volume_change_from_marketing + volume_change_from_retention + volume_change_from_stores)
    simulated_aov = base_aov * (1.0 + price_change)

    simulated_orders = int(base_orders * total_volume_mult)
    simulated_revenue = round(simulated_orders * simulated_aov, 2)
    revenue_delta_pct = round(((simulated_revenue - base_rev) / (base_rev or 1)) * 100, 2)
    revenue_delta_abs = round(simulated_revenue - base_rev, 2)

    # Estimated Net Margin (Baseline 18%, adjusting for pricing & marketing cost)
    base_margin_pct = 0.18
    marketing_cost_deduction = (base_rev * marketing_boost * 0.15)
    simulated_gross_profit = (simulated_revenue * (base_margin_pct + (price_change * 0.8))) - marketing_cost_deduction
    simulated_margin_pct = round(max(2.0, (simulated_gross_profit / simulated_revenue) * 100), 2)

    # Baseline vs Simulated 30-Day Forecast Timeline
    forecast_data = forecast_sales(days=30)
    forecast_points = forecast_data.get("forecast", [])
    
    timeline_labels = [f.get("date", "")[-5:] for f in forecast_points[:30]]
    timeline_base = [round(f.get("forecast", 0), 2) for f in forecast_points[:30]]
    timeline_simulated = [round(v * (1.0 + (revenue_delta_pct / 100.0)), 2) for v in timeline_base]

    # Strategic Risk Score (0 = extreme risk, 100 = optimal growth)
    risk_score = 75
    if price_change > 0.15: risk_score -= 20
    if price_change < -0.20: risk_score -= 25
    if simulated_margin_pct > 22: risk_score += 15
    if simulated_margin_pct < 10: risk_score -= 30
    risk_score = max(10, min(98, risk_score))

    risk_label = "Optimal Commercial Strategy" if risk_score >= 70 else ("Moderate Execution Risk" if risk_score >= 45 else "High Commercial Volatility")

    return {
        "success": True,
        "parameters": {
            "price_change_pct": round(price_change * 100, 1),
            "marketing_boost_pct": round(marketing_boost * 100, 1),
            "churn_reduction_pct": round(churn_reduction * 100, 1),
            "store_expansion_count": new_stores
        },
        "metrics": {
            "baseline_revenue": base_rev,
            "simulated_revenue": simulated_revenue,
            "revenue_delta_abs": revenue_delta_abs,
            "revenue_delta_pct": revenue_delta_pct,
            "simulated_orders": simulated_orders,
            "simulated_aov": round(simulated_aov, 2),
            "simulated_margin_pct": simulated_margin_pct,
            "risk_score": risk_score,
            "risk_label": risk_label
        },
        "chart": {
            "labels": timeline_labels,
            "baseline": timeline_base,
            "simulated": timeline_simulated
        }
    }
