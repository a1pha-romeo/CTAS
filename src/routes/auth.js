import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import config from '../config/env.js';
import { getDatabase } from '../db/connection.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/role.js';

const router = Router();

// Validation Schemas
const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
  role: z.enum(['admin', 'faculty', 'student'])
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters')
});

const adminCreateUserSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['admin', 'faculty', 'student']),
  fullName: z.string().min(1, 'Full name is required'),
  email: z.string().email('Valid email is required'),
  facultyId: z.number().nullable().optional(),
  studentId: z.number().nullable().optional()
});

const adminResetPasswordSchema = z.object({
  userId: z.number(),
  newPassword: z.string().min(6, 'New password must be at least 6 characters')
});

// 1. User Login
router.post('/login', validate(loginSchema), (req, res) => {
  const { username, password, role } = req.body;
  const db = getDatabase();

  const user = db.prepare(`
    SELECT u.*, 
           f.name as faculty_name, f.department_id as faculty_dept,
           s.name as section_name
    FROM users u
    LEFT JOIN faculty f ON u.faculty_id = f.id
    LEFT JOIN sections s ON u.student_id = s.id
    WHERE u.username = ?
  `).get(username);

  if (!user) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  // Check role match
  if (user.role !== role) {
    return res.status(403).json({
      error: `Role mismatch: This account is registered as '${user.role}', but you selected the '${role}' portal.`
    });
  }

  // Verify password
  const passwordValid = bcrypt.compareSync(password, user.password_hash);
  if (!passwordValid) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  // Generate JWT token
  const payload = {
    id: user.id,
    username: user.username,
    role: user.role,
    fullName: user.full_name,
    email: user.email,
    facultyId: user.faculty_id,
    studentId: user.student_id,
    facultyDept: user.faculty_dept,
    sectionName: user.section_name
  };

  const token = jwt.sign(payload, config.jwtSecret, { expiresIn: '7d' });

  // Store in httpOnly, SameSite=Lax cookie
  res.cookie('token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/'
  });

  // Log successful login
  try {
    db.prepare('INSERT INTO audit_log (user_id, action, details_json) VALUES (?, ?, ?)').run(
      user.id,
      'USER_LOGIN',
      JSON.stringify({ role: user.role, username: user.username })
    );
  } catch (err) {
    // Non-fatal audit log failure
  }

  res.json({
    success: true,
    message: 'Login successful',
    user: payload,
    token // also return token for API client flexibility
  });
});

// 2. User Logout
router.post('/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/'
  });
  res.json({ success: true, message: 'Logged out successfully' });
});

// 3. Current User Profile (/me)
router.get('/me', requireAuth, (req, res) => {
  const db = getDatabase();
  const user = db.prepare(`
    SELECT u.id, u.username, u.role, u.full_name, u.email, u.faculty_id, u.student_id,
           f.name as faculty_name, f.phone as faculty_phone, f.department_id,
           d.name as department_name, d.code as department_code,
           s.name as section_name, s.semester as section_semester
    FROM users u
    LEFT JOIN faculty f ON u.faculty_id = f.id
    LEFT JOIN departments d ON f.department_id = d.id
    LEFT JOIN sections s ON u.student_id = s.id
    WHERE u.id = ?
  `).get(req.user.id);

  if (!user) {
    return res.status(404).json({ error: 'User record not found' });
  }

  res.json({ user });
});

// 4. Change Own Password
router.post('/change-password', requireAuth, validate(changePasswordSchema), (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const db = getDatabase();

  const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id);
  if (!user || !bcrypt.compareSync(currentPassword, user.password_hash)) {
    return res.status(400).json({ error: 'Current password is incorrect' });
  }

  const newHash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, req.user.id);

  db.prepare('INSERT INTO audit_log (user_id, action, details_json) VALUES (?, ?, ?)').run(
    req.user.id,
    'PASSWORD_CHANGED',
    JSON.stringify({ username: req.user.username })
  );

  res.json({ success: true, message: 'Password updated successfully' });
});

// 5. Admin: Create New User Account
router.post('/admin/users', requireAuth, requireRole('admin'), validate(adminCreateUserSchema), (req, res) => {
  const { username, password, role, fullName, email, facultyId, studentId } = req.body;
  const db = getDatabase();

  // Check username uniqueness
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    return res.status(400).json({ error: `Username '${username}' is already in use` });
  }

  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare(`
    INSERT INTO users (username, password_hash, role, full_name, email, faculty_id, student_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(username, hash, role, fullName, email, facultyId || null, studentId || null);

  db.prepare('INSERT INTO audit_log (user_id, action, details_json) VALUES (?, ?, ?)').run(
    req.user.id,
    'ADMIN_CREATED_USER',
    JSON.stringify({ createdUserId: result.lastInsertRowid, username, role })
  );

  res.status(201).json({
    success: true,
    message: 'User account created successfully',
    userId: result.lastInsertRowid
  });
});

// 6. Admin: Reset User Password
router.post('/admin/reset-password', requireAuth, requireRole('admin'), validate(adminResetPasswordSchema), (req, res) => {
  const { userId, newPassword } = req.body;
  const db = getDatabase();

  const user = db.prepare('SELECT id, username FROM users WHERE id = ?').get(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const newHash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, userId);

  db.prepare('INSERT INTO audit_log (user_id, action, details_json) VALUES (?, ?, ?)').run(
    req.user.id,
    'ADMIN_RESET_PASSWORD',
    JSON.stringify({ targetUserId: userId, username: user.username })
  );

  res.json({
    success: true,
    message: `Password reset successfully for user '${user.username}'`
  });
});

export default router;
