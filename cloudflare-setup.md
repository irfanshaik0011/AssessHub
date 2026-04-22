# Cloudflare Environment Setup Guide (Hybrid Architecture)

Follow these steps to configure your Cloudflare Worker to act as the data layer for your D1 database while bridging with Firebase Auth.

## 1. D1 Database Configuration
You have already created the database. Add the following binding to your `wrangler.toml` to allow the Worker to communicate with it:

```toml
[[d1_databases]]
binding = "DB"
database_name = "exampro-db"
database_id = "8ef8359c-5e0b-49ec-babd-82f1dfeacc7f"
```

## 2. Initialize Worker Project
1. Create a new worker directory: `wrangler init exampro-api`.
2. Ensure the `wrangler.toml` includes the D1 binding above.
3. Deploy the initial worker: `wrangler deploy`.

## 3. Configure Environment Variables (Secrets)
In the Cloudflare Dashboard (Workers > Settings > Variables), add the following:
- `FIREBASE_PROJECT_ID`: Your Firebase project ID (required to verify JWTs).
- `GEMINI_API_KEY`: Your Google AI key.
- `CLOUDINARY_URL`: Your Cloudinary environment variable.

---

## [NEW - SECURITY HARDENING]

### 4. Firebase Token Verification Hardening
The Worker must perform full cryptographic verification of the Firebase ID Token. Do not trust the `sub` claim without validating the signature.
*   **Verification Steps**:
    1.  **aud (Audience)**: Must match your `FIREBASE_PROJECT_ID`.
    2.  **iss (Issuer)**: Must be `https://securetoken.google.com/<FIREBASE_PROJECT_ID>`.
    3.  **exp (Expiration)**: Must be in the future.
    4.  **sub (Subject)**: Must be a non-empty string (this is the Firebase UID).
*   **Public Key Caching**: Fetch Firebase public keys from `https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com` and cache them in the Worker using `Cache API` or a global variable to avoid latency on every request.
*   **Rejection**: Any token that is malformed, expired, or has an invalid signature must return a `401 Unauthorized` immediately.

### 5. Role Source & Authorization
*   **D1 as Source of Truth**: While Firebase handles *Identity*, Cloudflare D1 must handle *Authorization*. 
*   **Logic**: After verifying the Firebase JWT, the Worker must perform a lookup in the `users` table in D1 using the `sub` (UID) to retrieve the user's role (`admin`, `faculty`, or `student`).
*   **Why**: This allows for instant role revocation or status blocking (e.g., `status = 'blocked'`) without waiting for Firebase token expiration.

### 6. Strict CORS Policy
Disallow wildcard origins. Configure the Worker to only accept requests from your specific production and staging domains.
*   **Example**:
    ```typescript
    const allowedOrigins = ['https://exampro.edu', 'https://staging.exampro.edu'];
    const origin = request.headers.get('Origin');
    if (allowedOrigins.includes(origin)) {
      headers.set('Access-Control-Allow-Origin', origin);
    }
    ```

### 7. Cloudinary Signed Uploads
To prevent unauthorized uploads to your Cloudinary account, the frontend should not hold the `API_SECRET`.
*   **Worker-Generated Signatures**: Create an endpoint `GET /v1/proctor/sign-upload`. The Worker uses your `CLOUDINARY_SECRET` to generate a signature and returns it to the student. The student then uploads directly to Cloudinary using this signature.

---

## [NEW - PRODUCTION SAFEGUARD]

### 8. Double-Submission Protection
Prevent race conditions where a student might trigger multiple submission requests.
*   **Atomic Check**: Use a D1 transaction to check the current status of the attempt.
*   **Logic**: `UPDATE attempts SET status = 'SUBMITTED' WHERE id = ? AND status = 'IN_PROGRESS'`. If `changes === 0`, the request is rejected as a duplicate or invalid state transition.

### 9. Structured Error Handling
Implement a global `try/catch` wrapper in the Worker's `fetch` handler.
*   **Format**:
    ```json
    {
      "error": {
        "code": "INTERNAL_ERROR",
        "message": "A brief, safe description",
        "requestId": "cf-ray-id"
      }
    }
    ```
*   **Security**: Never return raw stack traces or database error strings to the client.

---

## [NEW - PERFORMANCE ENHANCEMENT]

### 10. Request Budget Modeling (500 Students / 1 Hour)
Modeling the load for a 1-hour exam with 500 concurrent students:
*   **Notification Polling (30s interval)**: 500 students * 120 requests = 60,000 requests.
*   **Faculty Monitoring (5s interval)**: 1 faculty * 720 requests = 720 requests.
*   **Proctoring Snapshots (3s interval)**: 500 students * 1,200 requests = 600,000 requests.
*   **Total Estimated Load**: ~660,720 requests per hour.
*   **Free Tier Warning**: Cloudflare's Free Tier limit is 100,000 requests/day. **This architecture requires the Workers Paid Tier ($5/mo) to function during a live exam.**

### 11. Database Index Strategy (D1 SQL)
```sql
-- Fast lookups for student attempts
CREATE INDEX idx_attempts_student_exam ON attempts(student_id, exam_id);

-- Faculty monitoring of live attempts
CREATE INDEX idx_attempts_monitor ON attempts(exam_id, status, last_heartbeat);

-- Question retrieval for exam start
CREATE INDEX idx_questions_exam ON questions(exam_id, difficulty);

-- Notification polling
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read, created_at);