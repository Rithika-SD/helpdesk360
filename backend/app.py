import os
from pathlib import Path
from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
from backend.config import Config
from backend.db import init_db, seed_data
from backend.routes.auth_routes import auth_bp
from backend.routes.ticket_routes import ticket_bp
from backend.routes.dashboard_routes import dashboard_bp

def create_app(test_config=None):
    app = Flask(__name__)
    app.config.from_object(Config)

    if test_config:
        app.config.update(test_config)

    # Configure CORS
    CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)

    # Initialize Database and Seed Data
    db_path = app.config.get("DATABASE_PATH")
    init_db(db_path)
    seed_data(db_path)

    # Register blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(ticket_bp)
    app.register_blueprint(dashboard_bp)

    dist_dir = Path(__file__).resolve().parent.parent / "frontend" / "dist"

    @app.route("/api/health", methods=["GET"])
    def health():
        return jsonify({
            "status": "healthy",
            "service": "HelpDesk 360 REST API",
            "version": "1.0.0"
        }), 200

    @app.errorhandler(400)
    def bad_request(e):
        return jsonify({"error": "Bad request.", "message": str(e)}), 400

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": "Resource not found."}), 404

    @app.errorhandler(405)
    def method_not_allowed(e):
        return jsonify({"error": "Method not allowed for this endpoint."}), 405

    @app.errorhandler(500)
    def internal_error(e):
        return jsonify({"error": "Internal server error. Please try again later."}), 500

    # Serve built React frontend if available
    @app.route("/", defaults={"path": ""})
    @app.route("/<path:path>")
    def serve_frontend(path):
        if path.startswith("api/"):
            return jsonify({"error": "API endpoint not found."}), 404
        if dist_dir.exists():
            file_path = dist_dir / path
            if path and file_path.is_file():
                return send_from_directory(str(dist_dir), path)
            index_file = dist_dir / "index.html"
            if index_file.is_file():
                return send_from_directory(str(dist_dir), "index.html")
        return jsonify({"message": "HelpDesk 360 API is active. Build frontend to view UI."}), 200

    return app

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app = create_app()
    print(f"[*] HelpDesk 360 unified server running on http://127.0.0.1:{port}")
    app.run(host="0.0.0.0", port=port, debug=False)
