'use strict';
const Student = require('../models/Student');
const Admin   = require('../models/Admin');
const email   = require('../utils/email');

// ── DASHBOARD STATS ───────────────────────────────────────────────────────────
exports.getStats = async (req, res, next) => {
  try {
    const [total, submitted, admitted, rejected, paid, incomplete] = await Promise.all([
      Student.countDocuments(),
      Student.countDocuments({ applicationStatus: 'submitted' }),
      Student.countDocuments({ applicationStatus: 'admitted' }),
      Student.countDocuments({ applicationStatus: 'rejected' }),
      Student.countDocuments({ paymentStatus: 'paid' }),
      Student.countDocuments({ applicationStatus: 'incomplete' }),
    ]);

    const revenueResult = await Student.aggregate([
      { $match: { paymentStatus: 'paid' } },
      { $group: { _id: null, total: { $sum: '$paymentAmount' } } },
    ]);
    const revenue = revenueResult[0]?.total || 0;

    res.json({
      success: true,
      stats: { total, submitted, admitted, rejected, paid, incomplete, revenue },
    });
  } catch (err) {
    next(err);
  }
};

// ── LIST ALL APPLICATIONS ─────────────────────────────────────────────────────
exports.listApplications = async (req, res, next) => {
  try {
    const { status, degreeType, faculty, search, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (status)     filter.applicationStatus = status;
    if (degreeType) filter.degreeType = degreeType;
    if (faculty)    filter.faculty = faculty;
    if (search) {
      filter.$or = [
        { firstName:         { $regex: search, $options: 'i' } },
        { lastName:          { $regex: search, $options: 'i' } },
        { email:             { $regex: search, $options: 'i' } },
        { applicationNumber: { $regex: search, $options: 'i' } },
      ];
    }

    const skip        = (parseInt(page) - 1) * parseInt(limit);
    const [students, total] = await Promise.all([
      Student.find(filter)
        .select('-password -verifyToken -resetToken')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Student.countDocuments(filter),
    ]);

    res.json({
      success: true,
      students,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) {
    next(err);
  }
};

// ── GET ONE APPLICATION ───────────────────────────────────────────────────────
exports.getApplication = async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.id).select('-password -verifyToken -resetToken');
    if (!student) return res.status(404).json({ success: false, message: 'Application not found.' });
    res.json({ success: true, student });
  } catch (err) {
    next(err);
  }
};

// ── UPDATE APPLICATION STATUS ─────────────────────────────────────────────────
exports.updateStatus = async (req, res, next) => {
  try {
    const { status, adminRemarks } = req.body;
    const validStatuses = ['incomplete', 'awaiting_payment', 'submitted', 'under_review', 'admitted', 'rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status.' });
    }

    const update = { applicationStatus: status, adminRemarks };
    if (status === 'admitted') update.admittedDate = new Date();

    const student = await Student.findByIdAndUpdate(req.params.id, { $set: update }, { new: true });
    if (!student) return res.status(404).json({ success: false, message: 'Application not found.' });

    // Send admission email
    if (status === 'admitted') {
      try {
        await email.sendAdmissionLetter(student.email, student.firstName, student.programme, student.applicationNumber);
      } catch (e) {
        console.error('[EMAIL ERROR]', e.message);
      }
    }

    res.json({ success: true, message: `Application status updated to ${status}.`, student });
  } catch (err) {
    next(err);
  }
};

// ── SEED ADMIN (first run only) ───────────────────────────────────────────────
exports.seedAdmin = async (req, res, next) => {
  try {
    const exists = await Admin.findOne({ role: 'superadmin' });
    if (exists) return res.status(400).json({ success: false, message: 'Admin already exists.' });

    const admin = await Admin.create({
      name:     'Super Admin',
      email:    process.env.ADMIN_EMAIL || 'admin@udusok.edu.ng',
      password: process.env.ADMIN_PASSWORD || 'Admin@123456',
      role:     'superadmin',
    });

    res.status(201).json({
      success: true,
      message: 'Admin created.',
      credentials: { email: admin.email, password: process.env.ADMIN_PASSWORD || 'Admin@123456' },
    });
  } catch (err) {
    next(err);
  }
};
