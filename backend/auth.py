import jwt
from datetime import datetime, timezone, timedelta
from functools import wraps
from flask import request, jsonify, g, has_app_context, current_app
from backend.config import Config
from backend.db import get_db

def get_secret_key():
    if has_app_context() and current_app.config.get("SECRET_KEY"):
        return current_app.config["SECRET_KEY"]
    return Config.SECRET_KEY

def generate_token(user):
    secret = get_secret_key()
    payload = {
        "sub": user["id"],
        "username": user["username"],
        "role": user["role"],
        "full_name": user["full_name"],
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(hours=Config.JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, secret, algorithm="HS256")

def decode_token(token):
    secret = get_secret_key()
    try:
        payload = jwt.decode(token, secret, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Missing or invalid authorization header. Bearer token required."}), 401

        token = auth_header.split(" ", 1)[1].strip()
        payload = decode_token(token)
        if not payload:
            return jsonify({"error": "Invalid or expired authorization token."}), 401

        # Check user in database
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT id, username, role, full_name, created_at FROM users WHERE id = ?", (payload["sub"],))
        user_row = cursor.fetchone()
        conn.close()

        if not user_row:
            return jsonify({"error": "User no longer exists."}), 401

        g.current_user = dict(user_row)
        return f(*args, **kwargs)
    return decorated_function

def role_required(*allowed_roles):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not hasattr(g, "current_user") or not g.current_user:
                return jsonify({"error": "Authentication required."}), 401

            if g.current_user["role"] not in allowed_roles:
                return jsonify({
                    "error": f"Forbidden. Role '{g.current_user['role']}' does not have permission to perform this action. Required: {', '.join(allowed_roles)}."
                }), 403

            return f(*args, **kwargs)
        return decorated_function
    return decorator
