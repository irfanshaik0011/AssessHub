# Migration Plan: Firestore to Cloudflare D1

## 1. Database Schema (Firestore to D1 SQL)
Convert NoSQL collections into relational tables in `exampro-db`.
- **Users Table**: `id` (Firebase UID), `email`, `name`, `role`, `status`, `branch`, `year`, `section`, `roll_number`, `created_at`.
- **Exams Table**: `id` (PK), `faculty_id` (FK), `title`, `subject`, `duration`, `exam_mode`, `start_time`, `end_time`, `status`, `is_published`, `is_active`, `questions_per_student`, `total_score`, `assigned_questions` (JSON).
- **Questions Table**: `id` (PK), `exam_id` (FK), `text`, `difficulty`, `question_type`, `option_a`, `option_b`, `option_c`, `option_d`, `correct_option`, `image_url`.
- **Attempts Table**: `id` (PK), `exam_id` (FK), `student_id` (FK), `status`, `started_at`, `submitted_at`, `expires_at`, `score`, `obtained_score`, `live_snapshot_url`, `live_noise_level`.
- **Allocations Table**: `id` (PK), `attempt_id` (FK), `question_id` (FK), `student_answer`, `score_weight`.
- **Notifications Table**: `id` (PK), `user_id` (FK), `title`, `message`, `type`, `is_read`, `created_at`.

## 2. Authentication Integration
- **Keep**: Firebase Auth for login/registration.
- **Change**: The frontend will now get the `idToken` from Firebase and send it to the Cloudflare Worker in the `Authorization` header.
- **Worker Logic**: The Worker will verify the token against Firebase's public keys to identify the user and their role.

## 3. Storage Integration
- **Keep**: Cloudinary for all images and proctoring snapshots.
- **Logic**: The frontend continues to upload snapshots to Cloudinary and sends the resulting URL to the Cloudflare Worker to be stored in the `attempts` table in D1.

## 4. Real-time to Polling
- **Change**: Replace Firestore `onSnapshot` with Worker API polling.

---

## [NEW - PRODUCTION SAFEGUARD]

### 5. Exam Integrity Enforcement
*   **Server-Side Expiry**: The Worker must reject any `PATCH /v1/exam/answer` if `CURRENT_TIMESTAMP > attempts.expires_at`. Do not trust the client-side timer.
*   **Unique Attempts**: Add a `UNIQUE(student_id, exam_id)` constraint in D1 to prevent a student from starting the same exam twice.
*   **Submission Lock**: Once an attempt status is `SUBMITTED` or `AUTO_SUBMITTED`, the Worker must reject all further modifications to answers or proctoring data for that attempt.
*   **Active Attempt Limit**: Prevent a student from having more than one `IN_PROGRESS` attempt across the entire platform.

### 6. Transaction Safety
The following operations **must** be wrapped in D1 Transactions:
1.  **Exam Start**: Creating the `attempt` record and populating the `allocations` table.
2.  **Submission**: Updating the `attempt` status, calculating the final score, and setting the `submitted_at` timestamp.
3.  **Score Calculation**: Atomic updates to the `obtained_score` based on the `allocations` data.

---

## [NEW - SECURITY HARDENING]

### 7. RBAC Middleware & Permission Matrix
Implement a centralized `checkRole(requiredRoles[])` function in the Worker.
*   **Student**: Can only `GET` assigned exams and `POST/PATCH` their own active attempt.
*   **Faculty**: Can `CRUD` their own exams and `GET` all attempts for exams they created.
*   **Admin**: Full access to user management and platform settings.

---

## [NEW - PERFORMANCE ENHANCEMENT]

### 8. Polling Performance Safeguards
*   **Notification Polling**: Minimum **30 seconds**. High-frequency polling for notifications will exhaust the Worker request budget and D1 read units.
*   **Faculty Monitoring**: **5–10 seconds**. This is sufficient for "live" monitoring without overwhelming the database.
*   **Danger**: 1-second polling with 500 students would result in 1.8 million requests per hour, likely triggering Cloudflare rate limits or significantly increasing costs.

### 9. Snapshot Optimization
*   **Throttled DB Updates**: While snapshots are taken every 3s, only update the `live_snapshot_url` in the D1 `attempts` table every **10–15 seconds**.
*   **Violation-Only Storage**: Configure the client to only send snapshots to the Worker if a violation is detected (e.g., `NO_FACE`). For normal snapshots, the client can upload to Cloudinary but skip the Worker DB update to save write units.

---

## Pre-Live Exam Production Checklist
- [ ] **Auth**: Firebase JWT verification validated with expired and malformed tokens.
- [ ] **Database**: All SQL Indexes created and `UNIQUE` constraints active.
- [ ] **Security**: CORS locked to production domains only.
- [ ] **Integrity**: Server-side `expires_at` check verified.
- [ ] **Load**: Worker Paid Tier enabled to handle >100k requests.
- [ ] **Testing**: Manual load test performed with at least 50 simulated concurrent users.