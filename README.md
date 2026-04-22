# ExamPro: Advanced Online Exam Proctoring Platform

ExamPro is a comprehensive, full-stack examination system featuring real-time AI-driven proctoring, role-based access control, and automated assessment management. It leverages a serverless architecture with Firebase for scalability and client-side AI for integrity monitoring.

## 📑 Index

1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [Feature Inventory](#3-feature-inventory)
4. [Core Functional Modules](#4-core-functional-modules)
5. [User Flows](#5-user-flows)
6. [API Architecture](#6-api-architecture)
7. [Database Schema (Firestore)](#7-database-schema-firestore)
8. [Authentication & Authorization](#8-authentication--authorization)
9. [External Integrations](#9-external-integrations)
10. [Security Mechanisms](#10-security-mechanisms)
11. [Configuration & Environment Variables](#11-configuration--environment-variables)
12. [Folder Structure](#12-folder-structure)
13. [Deployment Architecture](#13-deployment-architecture)
14. [Tech Stack](#14-tech-stack)
15. [Performance Optimizations](#15-performance-optimizations)
16. [Experimental / Unused Code](#16-experimental--unused-code)

---

## 1. Project Overview
ExamPro is designed to facilitate secure remote examinations. It provides distinct portals for Students (exam taking), Faculty (exam creation and monitoring), and Admins (platform management). The system uses computer vision and audio analysis to detect cheating in real-time.

## 2. System Architecture
- **Frontend**: React 18 SPA built with Vite and TypeScript.
- **Backend-as-a-Service**: Firebase (Authentication, Firestore, Cloud Messaging).
- **Microservices**: A Flask-based Python server for SMTP email operations.
- **Real-time Communication**: Firestore `onSnapshot` for live proctoring feeds and notifications.
- **AI Layer**: `face-api.js` for client-side face detection; Google Gemini for administrative assistance.

## 3. Feature Inventory

| Feature Name | Description | Path | Status |
| :--- | :--- | :--- | :--- |
| **AI Proctoring** | Face detection (no face/multi-face) and noise monitoring. | `src/components/CameraProctor.tsx` | ✅ |
| **Live Monitoring** | Real-time faculty view of student snapshots and noise levels. | `src/components/LiveMonitor.tsx` | ✅ |
| **Bulk Question Upload** | Excel/CSV parsing for question bank population. | `src/components/BulkUploadModal.tsx` | ✅ |
| **Dynamic Question Allocation** | Randomly assigns questions based on difficulty weights. | `src/hooks/useExams.ts` | ✅ |
| **Automated Grading** | Instant scoring for MCQ-based assessments. | `src/components/ExamInterface.tsx` | ✅ |
| **Maintenance Mode** | Global system lock with role-specific messaging. | `src/components/DeveloperPortal.tsx` | ✅ |
| **Push Notifications** | Background/Foreground alerts via FCM. | `src/hooks/useFCM.ts` | ✅ |
| **AI Assistant** | Gemini-powered help for Faculty and Admins. | `src/components/GeminiAssistant.tsx` | ✅ |
| **Result Analytics** | Visual performance trends and violation stats. | `src/components/FacultyAnalytics.tsx` | ✅ |
| **Magic Link Auth** | Passwordless sign-in via email links. | `src/contexts/AuthContext.tsx` | ✅ |
| **SMTP Email Service** | Microservice for sending system emails. | `python_server/app.py` | ✅ |

## 4. Core Functional Modules
- **Auth Module**: Handles RBAC, email verification, and account status (active/pending/blocked).
- **Exam Engine**: Manages the lifecycle of an exam from draft to archival, including time-synchronized attempts.
- **Proctoring Engine**: Client-side monitoring that logs violations and enforces auto-submission.
- **Admin Module**: Oversees faculty approvals, task assignments, and global system settings.

## 5. User Flows
1. **Student**: Register -> Verify Email -> View Assigned Exams -> Accept Rules -> Take Exam (Proctored) -> View Results.
2. **Faculty**: Register -> Await Admin Approval -> Create Exam / Receive Task -> Manage Questions -> Monitor Live -> Review Results.
3. **Admin**: Manage Users -> Approve Faculty -> Assign Tasks -> Approve Exams -> Monitor System Health.

## 6. API Architecture
### Python Microservice (Flask)
- `POST /send-email`: Sends SMTP emails. Requires `to`, `subject`, and `body`.
- `GET /health`: Returns service status.

### Firebase (Client-side SDK)
The frontend communicates directly with Firestore and Auth via the Firebase SDK, utilizing security rules for authorization.

## 7. Database Schema (Firestore)
### Collections
- **`users`**: `{ name, role, status, rollNumber, branch, year, section, dob, fcm_tokens[] }`
- **`exams`**: `{ title, faculty_id, status, is_active, questions_per_student, assigned_questions[] }`
- **`attempts`**: `{ exam_id, student_id, status, score, live_snapshot, live_noise_level }`
- **`questions`**: `{ exam_id, text, difficulty, question_type, options[], correct_option }`
- **`allocations`**: `{ attempt_id, question_id, student_answer, score_weight }`
- **`notifications`**: `{ user_id, title, message, type, is_read }`
- **`proctoring_logs`**: `{ attempt_id, type, metadata, created_at }`
- **`settings`**: Documents for `maintenance` and `rate_limits`.

## 8. Authentication & Authorization
- **Provider**: Firebase Auth (Email/Password, Magic Link).
- **Authorization**: Custom `AuthContext` enforcing RBAC.
- **Middleware**: `authenticateToken` logic is handled via Firestore Security Rules (implied) and client-side route guards in `App.tsx`.

## 9. External Integrations
- **Google Gemini**: AI Assistant for administrative tasks.
- **Cloudinary**: Storage for proctoring snapshots and question images.
- **Firebase Cloud Messaging (FCM)**: Real-time push notifications.
- **XLSX**: Client-side Excel/CSV processing.

## 10. Security Mechanisms
- **Fullscreen Enforcement**: Detects and logs exits from fullscreen mode.
- **Tab Switch Detection**: Monitors `visibilitychange` to prevent external searching.
- **Autosave**: Periodically syncs student answers to `allocations` to prevent data loss.
- **Violation Threshold**: Automatic exam termination after 3 proctoring violations.
- **Account Blocking**: Admins can instantly revoke access for any user.

## 11. Configuration & Environment Variables
- `VITE_FIREBASE_*`: Firebase project credentials.
- `VITE_GEMINI_API_KEY`: Google Generative AI key.
- `VITE_CLOUDINARY_*`: Image upload configuration.
- `SMTP_SERVER / SMTP_USER / SMTP_PASSWORD`: Email service credentials.

## 12. Folder Structure
```text
project-root/
├── public/               # Static assets & Service Workers
├── src/
│   ├── components/       # UI Components & Portals
│   ├── contexts/         # Auth State Management
│   ├── hooks/            # Business Logic (Exams, FCM)
│   ├── lib/              # Firebase Initialization
│   └── scripts/          # Database Seeding & Reset
├── python_server/        # Email Microservice
└── tailwind.config.js    # Styling Configuration
```

## 13. Deployment Architecture
- **Frontend**: Optimized for Vercel/Netlify/Firebase Hosting.
- **Backend**: Serverless (Firebase).
- **Microservice**: Designed for Docker or Heroku/Render deployment.

## 14. Tech Stack
- **Frontend**: React, TypeScript, Tailwind CSS, Lucide React.
- **Charts**: Recharts.
- **AI**: face-api.js, Google Generative AI.
- **Backend**: Firebase, Flask (Python).

## 15. Performance Optimizations
- **Lazy Loading**: Components are structured for efficient bundling.
- **Batch Writes**: Used in `NotificationBell` and `useExams` for efficient Firestore updates.
- **Snapshot Throttling**: Proctoring images are uploaded at 3-second intervals to balance security and bandwidth.

## 16. Experimental / Unused Code
- `scripts/reset_db.py`: Administrative utility for development environments.
- `python_server/app.py`: Optional microservice for SMTP-based notifications.