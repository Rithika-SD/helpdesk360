from flask import Blueprint, request, jsonify, g
from werkzeug.security import check_password_hash
from backend.db import get_db, ph
from backend.auth import generate_token, login_required

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body must be valid JSON."}), 400

    username = (data.get("username") or "").strip()
    password = data.get("password") or ""

    if not username:
        return jsonify({"error": "Username is required."}), 400
    if not password:
        return jsonify({"error": "Password is required."}), 400

    conn = get_db()
    cursor = conn.cursor()
    p = ph()
    cursor.execute(
        f"SELECT id, username, password_hash, role, full_name, created_at FROM users WHERE username = {p}",
        (username,)
    )
    user = cursor.fetchone()
    conn.close()

    if not user or not check_password_hash(user["password_hash"], password):
        return jsonify({"error": "Invalid username or password."}), 401

    user_dict = dict(user)
    del user_dict["password_hash"]

    token = generate_token(user_dict)
    return jsonify({
        "message": "Login successful.",
        "token": token,
        "user": user_dict
    }), 200

@auth_bp.route("/logout", methods=["POST"])
def logout():
    return jsonify({"message": "Logged out successfully."}), 200

@auth_bp.route("/me", methods=["GET"])
@login_required
def get_me():
    return jsonify({
        "user": g.current_user
    }), 200
