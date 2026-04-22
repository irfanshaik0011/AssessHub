# AI Development Rules - Online Exam Proctoring Platform

## Tech Stack Overview
- **Frontend**: React 18 with TypeScript and Vite.
- **Styling**: Tailwind CSS for all UI styling.
- **Backend**: Node.js with Express.js for RESTful API.
- **Real-time**: Socket.io for bidirectional communication (timers, alerts).
- **Database**: PostgreSQL (hosted on Supabase) accessed via the `pg` driver.
- **Authentication**: Custom JWT-based authentication with Bcrypt for hashing.
- **Proctoring**: `face-api.js` for face detection and Web Audio API for noise monitoring.
- **Icons**: Lucide React.

## Library Usage Guidelines

### UI & Styling
- **Icons**: Use **Lucide React**.
- **CSS**: Use **Tailwind CSS** utility classes. Avoid custom CSS files.

### State & Navigation
- **Routing**: Use **React Router (v6)**.
- **State Management**: Use **React Context** for global state (Auth).
- **Data Fetching**: Use the native `fetch` API to communicate with the Express backend.

### Backend & Database
- **API Design**: RESTful principles for Express routes.
- **Database Access**: Use the `pg` pool for PostgreSQL queries.
- **Real-time**: Use **Socket.io** for live updates.

### Proctoring & Security
- **Face Detection**: Use `face-api.js` with `tinyFaceDetector`.
- **Audio**: Use **Web Audio API** `AnalyserNode`.
- **Security**: Validate JWTs using `authenticateToken` middleware.