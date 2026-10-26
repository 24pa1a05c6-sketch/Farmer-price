import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export async function requireAuth(req, res, next) {
  try {
    const cookieToken = req.cookies?.kisansetu_token;
    const headerAuth = req.headers.authorization;
    const bearerToken = headerAuth && headerAuth.startsWith('Bearer ') ? headerAuth.slice(7) : null;
    const token = cookieToken || bearerToken;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please log in to continue.'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_fallback_secret_only_for_local_testing');
    const user = await User.findById(decoded.sub);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Session invalid or user no longer exists.'
      });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Session expired or invalid token. Please sign in again.'
    });
  }
}

export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Administrator privileges required for this operation.'
    });
  }
  next();
}
