'use strict';
const jwt     = require('jsonwebtoken');
const crypto  = require('crypto');
const Student = require('../models/Student');
const Admin   = require('../models/Admin');
const email   = require('../utils/email');

function generateToken(id, secret, expiresIn = '7d') {
  return jwt.sign({ id }, secret || process.env.JWT_SECRET, { expiresIn });
}

// ── STUDENT REGISTER ──────────────────────────────────────────────────────────
exports.register = async (req, res, next) => {
  try {
    const { firstName, lastName, middleName, email: userEmail, password, phone } = req.body;

    if (!firstName || !lastName || !userEmail || !password) {
      return res.status(400).json({ success: false, message: 'All required fields must be filled.' });
    }

    const exists = await Student.findOne({ email: userEmail.toLowerCase() });
    if (exists) return res.status(409).json({ success: false, message: 'An account with this email already exists.' });

    const verifyToken = crypto.randomBytes(32).toString('hex');
    const student = await Student.create({
      firstName, lastName, middleName,
      email: userEmail.toLowerCase(),
      password, phone, verifyToken,
    });

    // Send verification email
    try {
      await email.sendVerificationEmail(student.email, student.firstName, verifyToken);
    } catch (e) {
      console.error('[EMAIL ERROR]', e.message);
    }

    const token = generateToken(student._id);
    res.status(201).json({
      success: true,
      message: 'Account created. Please check your email to verify your account.',
      token,
      student: {
        id: student._id,
        firstName: student.firstName,
        lastName: student.lastName,
        email: student.email,
        applicationNumber: student.applicationNumber,
        applicationStatus: student.applicationStatus,
        paymentStatus: student.paymentStatus,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── STUDENT LOGIN ─────────────────────────────────────────────────────────────
exports.login = async (req, res, next) => {
  try {
    const { email: userEmail, password } = req.body;
    if (!userEmail || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const student = await Student.findOne({ email: userEmail.toLowerCase() });
    if (!student) return res.status(401).json({ success: false, message: 'Invalid email or password.' });

    if (student.lockUntil && new Date(student.lockUntil) > new Date()) {
      const mins = Math.ceil((new Date(student.lockUntil) - Date.now()) / 60000);
      return res.status(423).json({ success: false, message: `Account locked. Try again in ${mins} minute(s).` });
    }

    const valid = await student.comparePassword(password);
    if (!valid) {
      const attempts = (student.loginAttempts || 0) + 1;
      const update   = { loginAttempts: attempts };
      if (attempts >= 5) update.lockUntil = new Date(Date.now() + 30 * 60 * 1000);
      await Student.updateOne({ _id: student._id }, { $set: update });
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    await Student.updateOne({ _id: student._id }, { $set: { loginAttempts: 0, lockUntil: null, lastLogin: new Date() } });

    const token = generateToken(student._id);
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      token,
      student: {
        id: student._id,
        firstName: student.firstName,
        lastName: student.lastName,
        email: student.email,
        applicationNumber: student.applicationNumber,
        applicationStatus: student.applicationStatus,
        paymentStatus: student.paymentStatus,
        isVerified: student.isVerified,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── VERIFY EMAIL ──────────────────────────────────────────────────────────────
exports.verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.query;
    const student = await Student.findOne({ verifyToken: token });
    if (!student) return res.status(400).json({ success: false, message: 'Invalid or expired verification link.' });

    await Student.updateOne({ _id: student._id }, { $set: { isVerified: true, verifyToken: null } });
    res.json({ success: true, message: 'Email verified successfully. You can now log in.' });
  } catch (err) {
    next(err);
  }
};

// ── FORGOT PASSWORD ───────────────────────────────────────────────────────────
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email: userEmail } = req.body;
    const student = await Student.findOne({ email: userEmail?.toLowerCase() });
    if (!student) return res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });

    const token   = crypto.randomBytes(32).toString('hex');
    const expiry  = new Date(Date.now() + 60 * 60 * 1000);
    await Student.updateOne({ _id: student._id }, { $set: { resetToken: token, resetExpiry: expiry } });

    try {
      await email.sendPasswordReset(student.email, student.firstName, token);
    } catch (e) {
      console.error('[EMAIL ERROR]', e.message);
    }

    res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
  } catch (err) {
    next(err);
  }
};

// ── RESET PASSWORD ────────────────────────────────────────────────────────────
exports.resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    const student = await Student.findOne({ resetToken: token, resetExpiry: { $gt: new Date() } });
    if (!student) return res.status(400).json({ success: false, message: 'Invalid or expired reset link.' });

    student.password   = password;
    student.resetToken = null;
    student.resetExpiry = null;
    await student.save();

    res.json({ success: true, message: 'Password reset successfully. You can now log in.' });
  } catch (err) {
    next(err);
  }
};

// ── GET ME ────────────────────────────────────────────────────────────────────
exports.getMe = async (req, res) => {
  res.json({ success: true, student: req.student });
};

// ── LOGOUT ────────────────────────────────────────────────────────────────────
exports.logout = (req, res) => {
  res.clearCookie('token');
  res.json({ success: true, message: 'Logged out.' });
};

// ── ADMIN LOGIN ───────────────────────────────────────────────────────────────
exports.adminLogin = async (req, res, next) => {
  try {
    const { email: adminEmail, password } = req.body;
    const admin = await Admin.findOne({ email: adminEmail?.toLowerCase() });
    if (!admin || !admin.isActive) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const valid = await admin.comparePassword(password);
    if (!valid) return res.status(401).json({ success: false, message: 'Invalid credentials.' });

    await Admin.updateOne({ _id: admin._id }, { $set: { lastLogin: new Date() } });

    const token = generateToken(admin._id);
    res.cookie('adminToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      token,
      admin: { id: admin._id, name: admin.name, email: admin.email, role: admin.role },
    });
  } catch (err) {
    next(err);
  }
};
