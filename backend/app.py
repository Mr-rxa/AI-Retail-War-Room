from flask import Flask, send_from_directory
from flask_cors import CORS
import os
from backend.controllers.ai_controller import ai_controller
from backend.controllers.analytics_controller import analytics_controller
from backend.controllers.anomaly_controller import anomaly_controller
from backend.controllers.dashboard_controller import dashboard_controller
from backend.controllers.forecast_controller import forecast_controller
from backend.middleware.error_handler import register_error_handlers
from backend.utils.cache import cache
from flasgger import Swagger

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

FRONTEND_DIR = os.path.join(BASE_DIR, "..", "frontend")
PAGES_DIR = os.path.join(FRONTEND_DIR, "pages")

app = Flask(
    __name__,
    static_folder=FRONTEND_DIR,
    static_url_path=""
)

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
def index():
    return send_from_directory(FRONTEND_DIR, "index.html")

# Pages
@app.route("/dashboard")
def dashboard():
    return send_from_directory(PAGES_DIR, "dashboard.html")

@app.route("/advisor")
def advisor():
    return send_from_directory(PAGES_DIR, "advisor.html")

@app.route("/anomaly")
def anomaly():
    return send_from_directory(PAGES_DIR, "anomaly.html")

@app.route("/customer")
def customer():
    return send_from_directory(PAGES_DIR, "customer.html")

@app.route("/forecast")
def forecast():
    return send_from_directory(PAGES_DIR, "forecast.html")

@app.route("/insights")
def insights():
    return send_from_directory(PAGES_DIR, "insights.html")

# Serve CSS, JS, Images, Fonts, Components, etc.
@app.route("/<path:path>")
def static_files(path):
    return send_from_directory(FRONTEND_DIR, path)


@app.route("/favicon.ico")
def favicon():

    return "", 204


if __name__ == "__main__":

    app.run(debug=True)
