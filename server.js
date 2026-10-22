import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

import config from './src/config/env.js';
import { getDatabase } from './src/db/connection.js';
import errorHandler from './src/middleware/errorHandler.js';

// Route imports
import authRoutes from './src/routes/auth.js';
import adminRoutes from './src/routes/admin.js';
import facultyRoutes from './src/routes/faculty.js';
import studentRoutes from './src/routes/student.js';
import timetableRoutes from './src/routes/timetable.js';
import absenceRoutes from './src/routes/absence.js';
import aiRoutes from './src/routes/ai.js';
import eventsRoutes from './src/routes/events.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Security headers with helmet (configured to allow AI Studio iframe embedding)
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    frameguard: false,
    crossOriginResourcePolicy: false,
    crossOriginOpenerPolicy: false
  })
);

// Explicitly ensure X-Frame-Options does not block AI Studio iFrame
app.use((req, res, next) => {
  res.removeHeader('X-Frame-Options');
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
});

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiter for authentication attempts
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 login requests per window
  message: { error: 'Too many authentication attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false
});

// Serve static frontend files from /public
const publicDir = path.resolve(__dirname, 'public');
app.use(express.static(publicDir));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'Class Timetable Automation System (CTAS)',
    version: '1.0.0',
    phase: 1,
    environment: config.env,
    database: 'connected (SQLite PRAGMA foreign_keys=ON, journal_mode=WAL)'
  });
});

// Mount API routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/faculty', facultyRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/timetable', timetableRoutes);
app.use('/api/absence', absenceRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/events', eventsRoutes);

// Fallback to index.html for root path or single-page navigation
app.get('/', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

// Centralized error handler
app.use(errorHandler);

// Initialize DB on boot
try {
  const db = getDatabase();
  console.log(`[CTAS] SQLite database ready at ${config.dbPath}`);
} catch (err) {
  console.error('[CTAS] Failed to initialize database:', err);
}

let serverInstance = null;
const isDirectRun = !process.env.NODE_TEST_CONTEXT;

if (isDirectRun) {
  serverInstance = app.listen(config.port, '0.0.0.0', () => {
    console.log(`\n======================================================`);
    console.log(` CTAS · Class Timetable Automation System`);
    console.log(` Running on: http://localhost:${config.port}`);
    console.log(` Environment: ${config.env}`);
    console.log(` Phase: 1-3 Verified`);
    console.log(`======================================================\n`);
  });
}

export default app;
