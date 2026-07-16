from backend.repositories.dashboard_repository import *

def get_dashboard(filters=None):

    if filters is None:
        filters = {}

    dashboard = {

        "kpis": fetch_kpis(filters),

        "monthly_sales": fetch_monthly_sales(filters),

        "top_categories": fetch_top_categories(filters),

        "payment_types": fetch_payment_types(filters),

        "state_sales": fetch_state_sales(filters),

        "filter_options": fetch_filter_options(),

        "applied_filters": filters

    }

    return dashboard
