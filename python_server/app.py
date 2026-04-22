from flask import Flask, request, jsonify
from flask_cors import CORS
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
import time
import hashlib
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

# SMTP Configuration
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
SENDER_EMAIL = os.getenv("SENDER_EMAIL", SMTP_USER)

@app.route('/debug-env', methods=['GET'])
def debug_env():
    """Checks for required environment variables and returns their status."""
    required_vars = {
        "CLOUDINARY_API_SECRET": os.getenv("CLOUDINARY_API_SECRET"),
        "VITE_CLOUDINARY_API_KEY": os.getenv("VITE_CLOUDINARY_API_KEY"),
        "VITE_CLOUDINARY_CLOUD_NAME": os.getenv("VITE_CLOUDINARY_CLOUD_NAME"),
        "SMTP_USER": os.getenv("SMTP_USER"),
        "SMTP_PASSWORD": os.getenv("SMTP_PASSWORD")
    }
    
    status = {}
    for var, value in required_vars.items():
        if not value:
            status[var] = "MISSING"
        elif len(value) < 4:
            status[var] = "INVALID (Too short)"
        else:
            status[var] = f"PRESENT ({value[:2]}...{value[-2:]})"
            
    return jsonify({
        "status": "ok",
        "variables": status,
        "server_time": int(time.time())
    })

@app.route('/send-email', methods=['POST'])
def send_email():
    data = request.get_json()
    recipient = data.get('to')
    subject = data.get('subject')
    body = data.get('body')
    is_html = data.get('html', False)

    if not all([recipient, subject, body]):
        return jsonify({"error": "Missing required fields"}), 400

    try:
        msg = MIMEMultipart()
        msg['From'] = SENDER_EMAIL
        msg['To'] = recipient
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'html' if is_html else 'plain'))

        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.send_message(msg)
        return jsonify({"message": "Email sent successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/sign-cloudinary', methods=['POST'])
def sign_cloudinary():
    """Generates a signature for secure Cloudinary uploads with CDN invalidation."""
    try:
        data = request.get_json()
        public_id = data.get('public_id')
        timestamp = int(time.time())
        
        api_secret = os.getenv("CLOUDINARY_API_SECRET")
        api_key = os.getenv("VITE_CLOUDINARY_API_KEY")
        
        if not api_secret:
            return jsonify({"error": "CLOUDINARY_API_SECRET not found on server"}), 500

        # We sign ONLY these three parameters. 
        # Alphabetical order: invalidate, public_id, timestamp
        params_to_sign = {
            "invalidate": "true",
            "public_id": public_id,
            "timestamp": str(timestamp)
        }
        
        sorted_keys = sorted(params_to_sign.keys())
        parameter_string = "&".join([f"{k}={params_to_sign[k]}" for k in sorted_keys])
        
        signature_string = f"{parameter_string}{api_secret}"
        signature = hashlib.sha1(signature_string.encode('utf-8')).hexdigest()
        
        return jsonify({
            "signature": signature,
            "timestamp": timestamp,
            "api_key": api_key
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy"}), 200

if __name__ == '__main__':
    # Render requires binding to 0.0.0.0 and using the PORT env variable
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)