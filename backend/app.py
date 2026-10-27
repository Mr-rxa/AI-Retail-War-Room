import os
import sys

# Ensure root directory is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from flask import Flask, send_from_directory, redirect
from flask_cors import CORS
from backend.controllers.ai_controller import ai_controller
from backend.controllers.analytics_controller import analytics_controller
from backend.controllers.anomaly_controller import anomaly_controller
from backend.controllers.dashboard_controller import dashboard_controller
from backend.controllers.forecast_controller import forecast_controller
from backend.controllers.upload_controller import upload_controller
from backend.controllers.chat_controller import chat_controller
from backend.controllers.scenario_controller import scenario_controller
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
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024  # 100 MB max request body size

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

app.register_blueprint(
    upload_controller,
    url_prefix="/api/upload"
)

app.register_blueprint(
    chat_controller,
    url_prefix="/api/chat"
)

app.register_blueprint(
    scenario_controller,
    url_prefix="/api/scenario"
)

@app.route("/")
def index():
    return send_from_directory(FRONTEND_DIR, "index.html")

# Pages & Page Aliases
@app.route("/dashboard")
@app.route("/dashboard.html")
@app.route("/pages/dashboard.html")
def dashboard():
    return send_from_directory(PAGES_DIR, "dashboard.html")

@app.route("/chat")
@app.route("/chat.html")
@app.route("/pages/chat.html")
def chat():
    return send_from_directory(PAGES_DIR, "chat.html")

@app.route("/scenario")
@app.route("/scenario.html")
@app.route("/pages/scenario.html")
def scenario():
    return send_from_directory(PAGES_DIR, "scenario.html")

@app.route("/advisor")
@app.route("/advisor.html")
@app.route("/pages/advisor.html")
def advisor():
    return send_from_directory(PAGES_DIR, "advisor.html")

@app.route("/anomaly")
@app.route("/anomaly.html")
@app.route("/pages/anomaly.html")
def anomaly():
    return send_from_directory(PAGES_DIR, "anomaly.html")

@app.route("/customer")
@app.route("/customer.html")
@app.route("/pages/customer.html")
def customer():
    return send_from_directory(PAGES_DIR, "customer.html")

@app.route("/forecast")
@app.route("/forecast.html")
@app.route("/pages/forecast.html")
def forecast():
    return send_from_directory(PAGES_DIR, "forecast.html")

@app.route("/insights")
@app.route("/insights.html")
@app.route("/pages/insights.html")
def insights():
    return send_from_directory(PAGES_DIR, "insights.html")

@app.route("/upload")
@app.route("/upload.html")
@app.route("/pages/upload.html")
def upload_page():
    return send_from_directory(PAGES_DIR, "upload.html")


@app.route("/present")
@app.route("/present.html")
@app.route("/presentation")
@app.route("/presentation.html")
def presentation_page():
    return redirect("/dashboard?present=1")



# Serve CSS, JS, Images, Fonts, Components, etc.
@app.route("/<path:path>")
def static_files(path):
    return send_from_directory(FRONTEND_DIR, path)


@app.route("/favicon.ico")
def favicon():

    return "", 204


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False, use_reloader=False)
