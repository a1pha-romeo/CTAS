import jwt from 'jsonwebtoken';
import config from '../config/env.js';

export function requireAuth(req, res, next) {
  const token = req.cookies?.token || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
  const url = req.originalUrl || (req.baseUrl + req.path);

  if (!token) {
    if (req.accepts('html') && !url.startsWith('/api/')) {
      return res.redirect('/#login');
    }
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = decoded;
    next();
  } catch (err) {
    res.clearCookie('token');
    if (req.accepts('html') && !url.startsWith('/api/')) {
      return res.redirect('/#login');
    }
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
}

export function optionalAuth(req, res, next) {
  const token = req.cookies?.token || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
  if (token) {
    try {
      req.user = jwt.verify(token, config.jwtSecret);
    } catch {
      // ignore
    }
  }
  next();
}

export default requireAuth;
