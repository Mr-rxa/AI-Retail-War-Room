from flask import Flask
from flask_cors import CORS

from backend.controllers.ai_controller import ai_controller
from backend.controllers.analytics_controller import analytics_controller
from backend.controllers.anomaly_controller import anomaly_controller
from backend.controllers.dashboard_controller import dashboard_controller
from backend.controllers.forecast_controller import forecast_controller
from backend.middleware.error_handler import register_error_handlers
from backend.utils.cache import cache
from flasgger import Swagger


app = Flask(__name__)
Swagger(app)
cache.init_app(app)

CORS(app)

register_error_handlers(app)

app.register_blueprint(
    dashboard_controller,
    url_prefix="/api"
)

app.register_blueprint(
    analytics_controller,
    url_prefix="/api/analytics"
)

app.register_blueprint(
    forecast_controller,
    url_prefix="/api/forecast"
)

app.register_blueprint(
    ai_controller,
    url_prefix="/api/ai"
)

app.register_blueprint(
    anomaly_controller,
    url_prefix="/api"
)

@app.route("/")
def home():

    return {
        "project": "AI Retail War Room",
        "status": "Running"
    }


@app.route("/favicon.ico")
def favicon():

    return "", 204


if __name__ == "__main__":

    app.run(debug=True)
