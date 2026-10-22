import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/role.js';
import {
  reportAbsence,
  findEligibleSubstitutes,
  claimSubstitution,
  assignSubstitution,
  getOpenSubstitutions,
  getAbsenceBoard
} from '../services/substitution.js';
import { getDatabase } from '../db/connection.js';

const router = Router();

/**
 * POST /api/absence/report
 * Faculty or Admin reports absence or lateness
 */
router.post('/report', requireAuth, (req, res) => {
  try {
    let { facultyId, date, type, expectedArrival, reason } = req.body;

    // If logged in as faculty, default/lock facultyId to their own
    if (req.user.role === 'faculty') {
      if (!req.user.facultyId) {
        return res.status(400).json({ error: 'Logged-in user is not linked to a faculty profile' });
      }
      facultyId = req.user.facultyId;
    } else if (req.user.role === 'admin') {
      if (!facultyId) {
        return res.status(400).json({ error: 'Admin must specify facultyId' });
      }
    } else {
      return res.status(403).json({ error: 'Students cannot report absence' });
    }

    const result = reportAbsence({
      facultyId: Number(facultyId),
      date,
      type,
      expectedArrival: expectedArrival || null,
      reason,
      reportedByUserId: req.user.id
    });

    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * GET /api/absence/board
 * Get absence monitor board (for Admin and Faculty)
 */
router.get('/board', requireAuth, (req, res) => {
  try {
    const { date } = req.query;
    const board = getAbsenceBoard(date || null);
    res.json({ absences: board });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/absence/open
 * Get open substitutions (with candidate eligibility check for logged-in faculty)
 */
router.get('/open', requireAuth, (req, res) => {
  try {
    const facultyId = req.user.facultyId || null;
    const openSubs = getOpenSubstitutions(facultyId);
    res.json({ substitutions: openSubs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/absence/candidates/:entryId
 * Query eligible substitutes ranked by heuristic score
 */
router.get('/candidates/:entryId', requireAuth, (req, res) => {
  try {
    const entryId = Number(req.params.entryId);
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ error: 'Date query param is required (YYYY-MM-DD)' });
    }

    const candidates = findEligibleSubstitutes(entryId, date);
    res.json({ candidates });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/absence/substitute/claim
 * Mode A: Faculty self-service claim
 */
router.post('/substitute/claim', requireAuth, (req, res) => {
  try {
    const { timetableEntryId, date } = req.body;
    if (!timetableEntryId || !date) {
      return res.status(400).json({ error: 'timetableEntryId and date are required' });
    }

    if (!req.user.facultyId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only faculty members can claim substitution slots' });
    }

    const facultyId = req.user.facultyId;
    if (!facultyId) {
      return res.status(400).json({ error: 'Current user does not have a linked faculty profile' });
    }

    const result = claimSubstitution({
      timetableEntryId: Number(timetableEntryId),
      dateStr: date,
      substituteFacultyId: facultyId,
      userId: req.user.id
    });

    res.json({ success: true, message: 'Substitution successfully claimed!', result });
  } catch (err) {
    // Check if error is a concurrency conflict
    if (err.message.includes('already been claimed') || err.message.includes('just claimed by another')) {
      return res.status(409).json({ error: err.message });
    }
    res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/absence/substitute/assign
 * Mode B: Admin direct assignment
 */
router.post('/substitute/assign', requireAuth, requireRole('admin'), (req, res) => {
  try {
    const { timetableEntryId, date, substituteFacultyId } = req.body;
    if (!timetableEntryId || !date || !substituteFacultyId) {
      return res.status(400).json({ error: 'timetableEntryId, date, and substituteFacultyId are required' });
    }

    const result = assignSubstitution({
      timetableEntryId: Number(timetableEntryId),
      dateStr: date,
      substituteFacultyId: Number(substituteFacultyId),
      adminUserId: req.user.id
    });

    res.json({ success: true, message: 'Substitute faculty assigned successfully', result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/absence/cancel/:id
 * Cancel an absence report
 */
router.post('/cancel/:id', requireAuth, (req, res) => {
  try {
    const absenceId = Number(req.params.id);
    const db = getDatabase();

    const absence = db.prepare('SELECT * FROM absences WHERE id = ?').get(absenceId);
    if (!absence) {
      return res.status(404).json({ error: 'Absence not found' });
    }

    if (req.user.role === 'faculty' && req.user.facultyId !== absence.faculty_id) {
      return res.status(403).json({ error: 'Cannot cancel an absence reported by another faculty' });
    }

    db.prepare("UPDATE absences SET status = 'cancelled' WHERE id = ?").run(absenceId);
    db.prepare("DELETE FROM substitutions WHERE absence_id = ? AND status = 'requested'").run(absenceId);

    res.json({ success: true, message: 'Absence cancelled successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
