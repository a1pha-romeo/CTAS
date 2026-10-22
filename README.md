# Class Timetable Automation System (CTAS)

**CTAS** is a full-stack academic scheduling platform designed for colleges. It automatically generates conflict-free timetables using a deterministic constraint-satisfaction solver (CSP), enables administrator customisation with instant drag-and-drop validation, provides real-time calendar tracking for faculty and students, handles faculty absences and lateness by surfacing available substitutes on a live board, and integrates Grok AI for timetable image extraction, clash diagnosis, and decision ranking.

---

## Architecture & Technology Stack

- **Frontend**: Vanilla HTML5, CSS3 (with CSS variables, light/dark themes, responsive grid), and ES6+ JavaScript modules. No frontend framework dependencies.
- **Backend**: Node.js + Express with Helmet security headers, cookie-parser, express-rate-limit, and Zod input validation.
- **Database**: SQLite via `better-sqlite3` with `PRAGMA foreign_keys = ON` and Write-Ahead Logging (`PRAGMA journal_mode = WAL`). Hard constraints are enforced at the database level using scoped UNIQUE indexes.
- **AI Integration**: Grok AI via official xAI REST endpoints (`https://api.x.ai/v1`) with full offline/graceful fallback when API keys are not provided.
- **Real-Time Updates**: Server-Sent Events (SSE) with automatic reconnection.

---

## Directory Structure

```
ctas/
├── server.js                      # Express application entry point
├── package.json                   # Dependencies and run scripts
├── .env.example                   # Environment variable template
├── .env                           # Local environment configuration
├── README.md                      # Documentation and operational guide
├── data/                          # SQLite database directory (git-ignored)
│   └── timetable.db
├── uploads/                       # Temporary timetable image uploads
├── src/
│   ├── config/
│   │   └── env.js                 # Centralized configuration and AI checks
│   ├── db/
│   │   ├── connection.js          # SQLite connection manager with WAL & FK
│   │   ├── schema.sql             # SQL schema with tables and UNIQUE constraints
│   │   ├── seed.js                # Database seeder with realistic sample data
│   │   └── reset.js               # Database reset utility
│   ├── middleware/
│   │   ├── auth.js                # JWT cookie/header authentication
│   │   ├── role.js                # Role-based access control (Admin/Faculty/Student)
│   │   ├── errorHandler.js        # Centralized error handler
│   │   └── validate.js            # Zod request validation middleware
│   ├── routes/
│   │   ├── auth.js                # Login, logout, current user
│   │   ├── admin.js               # Master data CRUD & system management
│   │   ├── faculty.js             # Faculty schedule and profile
│   │   ├── student.js             # Student section schedules
│   │   ├── timetable.js           # Generation, versioning, drag-and-drop edits
│   │   ├── absence.js             # Absence reporting & substitution board
│   │   ├── ai.js                  # Grok AI endpoints and status
│   │   └── events.js              # Server-Sent Events (SSE) stream
│   └── services/
│       ├── scheduler.js           # CSP generator (backtracking + forward-checking)
│       ├── validator.js           # Deterministic timetable conflict validator
│       ├── substitution.js        # Date-specific substitute finder & assigner
│       ├── calendar.js            # Monthly/weekly calendar date mapper
│       ├── sse.js                 # SSE client connection manager and broadcaster
│       └── ai/
│           ├── grokClient.js      # xAI HTTP client
│           ├── visionImport.js    # Grok Vision timetable OCR & schema extraction
│           ├── clashReasoner.js   # Grok Reasoning clash diagnosis & suggestions
│           └── decisionManager.js # Grok Decision substitute and swap ranking
└── public/
    ├── index.html                 # Hero landing & multi-role login portal
    ├── admin/index.html           # Administrator console
    ├── faculty/index.html         # Faculty calendar & availability portal
    ├── student/index.html         # Student section timetable viewer
    ├── css/
    │   ├── variables.css          # Color tokens, maroon & blush palette, dark mode
    │   ├── base.css               # Typography reset, Bebas Neue & Inter fonts
    │   ├── components.css         # Top nav, role cards, buttons, toast system
    │   ├── animations.css         # Micro-interactions, slide & glow effects
    │   └── pages.css              # Page layouts and responsive containers
    └── js/
        ├── api.js                 # Centralized fetch wrapper
        ├── auth.js                # Authentication helpers & route guards
        ├── calendar.js            # Month grid with Green-Present convention
        ├── timetableGrid.js       # Drag-and-drop timetable grid component
        ├── toast.js               # Animated notification toasts
        ├── sse.js                 # Real-time event listener
        ├── theme.js               # Light/dark mode toggle with localStorage
        └── landing.js             # Role selection & login interactions
```

---

## Quickstart Guide

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **npm** or **bun**

### 2. Installation
Clone or navigate to the project directory:
```bash
npm install
```

### 3. Environment Setup
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Edit `.env` to configure your settings and paste your Grok AI API keys:
```env
PORT=3000
JWT_SECRET=your_long_random_jwt_secret_key_here
DB_PATH=./data/timetable.db

# ===== GROK AI KEYS (paste your keys here) =====
GROK_API_BASE=https://api.x.ai/v1
GROK_VISION_API_KEY=PASTE_YOUR_VISION_KEY_HERE
GROK_VISION_MODEL=grok-2-vision-1212
GROK_REASONING_API_KEY=PASTE_YOUR_REASONING_KEY_HERE
GROK_REASONING_MODEL=grok-2-1212
GROK_DECISION_API_KEY=PASTE_YOUR_DECISION_KEY_HERE
GROK_DECISION_MODEL=grok-2-1212
```

> **Note**: CTAS works fully offline of AI when the Grok keys are empty. The application gracefully displays an "AI Key Not Configured" indicator and executes deterministic fallback algorithms for substitutions and clash validation.

### 4. Running the Application
```bash
npm start
```
The server will start at `http://localhost:3000`.

### 5. Running the Complete Test Suite
```bash
npm test
```
Executes all 63 automated tests covering:
- Database constraints and collision prevention
- RBAC authentication and role route guards
- CSP scheduling engine (backtracking and forward-checking)
- Conflict validator (11 violation codes)
- Admin studio drag-and-drop operations
- Faculty calendar and availability logic
- Absence reporting and substitution flow
- Grok AI services (Vision OCR, Clash Reasoner, Decision Support)

---

## Default Credentials (Sample Data)

| Role | Username | Password | Access Rights |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin` | `Admin@123` | Full control: master data, timetable generation, studio, audit, AI center |
| **Faculty** | `faculty1` to `faculty10` | `Faculty@123` | Teaching calendar, absence reporting, availability board, substitution claims |
| **Student** | `student1` to `student4` | `Student@123` | Read-only section schedule, current period tracker, department timetable |

*Note: Please change default passwords after first deployment.*

---

## Grok AI Intelligence Center (Phases 10, 11, 12)

CTAS is equipped with a specialized three-tier Grok AI integration:

1. **Grok Vision (Phase 10)**:
   - Digitizes uploaded timetable images/screenshots (PNG/JPG/WEBP up to 8 MB) into structured period blocks.
   - Automatically fuzzy-matches courses, faculty members, and rooms to active institutional master data.
   - Provides an interactive review screen with confidence metrics, live conflict checking, and one-click draft creation.
   - Includes a deterministic sample capture generator for immediate demonstration even without an active API key.

2. **Grok Reasoning (Phase 11)**:
   - Takes deterministic validator conflict violations and diagnoses why each clash matters pedagogically and operationally.
   - Provides 2 to 3 actionable fix proposals with expected side effects and tradeoffs.
   - Persists issues to `ai_issue_log` and integrates directly with the Timetable Studio.

3. **Grok Decision Support (Phase 12)**:
   - Multi-objective candidate ranking for faculty substitutions when teachers are absent or delayed.
   - Weights subject qualifications, department affinity, and weekly workload balancing to prevent educator burnout.
   - Calculates collision-free reschedule windows for uncovered lectures/labs with one-click administrative approval.

---

## Instant Presentation Demo Mode

Click the **🚀 Launch Instant Presentation Demo Mode** button on the landing page login panel to instantly authenticate with administrative privileges and load verified college schedules in seconds.

---

## Accessing from Other Devices on Local Wi-Fi
To test the multi-device real-time updates (e.g. mobile student view vs admin desktop):
1. Find your machine's local IP address (`ipconfig` on Windows or `ifconfig` / `ip a` on macOS/Linux).
2. Open `http://<YOUR_LOCAL_IP>:3000` in the browser of any phone, tablet, or laptop connected to the same Wi-Fi network.

---

## Database Management & Backup
- **Location**: `data/timetable.db`
- **Backup**: Simply copy `data/timetable.db` to a safe location while the server is running (SQLite WAL mode allows safe online reads).
- **Reset**: Run `npm run reset-db` or `npm run seed` to regenerate clean master data.

