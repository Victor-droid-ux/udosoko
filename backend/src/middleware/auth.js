'use strict';
const jwt     = require('jsonwebtoken');
const Student = require('../models/Student');
const Admin   = require('../models/Admin');

exports.protectStudent = async (req, res, next) => {
  try {
    const token = (req.headers.authorization || '').replace(/^Bearer\s+/, '') ||
                  req.cookies?.token;
    if (!token) return res.status(401).json({ success: false, message: 'Not authenticated.' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const student = await Student.findById(decoded.id).select('-password');
    if (!student) return res.status(401).json({ success: false, message: 'Account not found.' });

    req.student = student;
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
};

exports.protectAdmin = async (req, res, next) => {
  try {
    const token = (req.headers.authorization || '').replace(/^Bearer\s+/, '') ||
                  req.cookies?.adminToken;
    if (!token) return res.status(401).json({ success: false, message: 'Not authenticated.' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const admin   = await Admin.findById(decoded.id).select('-password');
    if (!admin || !admin.isActive) return res.status(401).json({ success: false, message: 'Admin not found.' });

    req.admin = admin;
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
};

exports.requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.admin?.role)) {
    return res.status(403).json({ success: false, message: 'Access denied.' });
  }
  next();
};
