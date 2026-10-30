'use strict';
const Student = require('../models/Student');
const email   = require('../utils/email');

// ── GET MY APPLICATION ────────────────────────────────────────────────────────
exports.getMyApplication = async (req, res) => {
  res.json({ success: true, application: req.student });
};

// ── UPDATE PERSONAL INFO ──────────────────────────────────────────────────────
exports.updatePersonalInfo = async (req, res, next) => {
  try {
    const allowed = ['firstName','lastName','middleName','gender','dateOfBirth',
                     'phone','nationality','stateOfOrigin','lga','address'];
    const update  = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) update[f] = req.body[f]; });

    const student = await Student.findByIdAndUpdate(
      req.student._id, { $set: update }, { new: true, runValidators: true }
    ).select('-password');

    res.json({ success: true, message: 'Personal information updated.', student });
  } catch (err) {
    next(err);
  }
};

// ── UPDATE PROGRAMME CHOICE ───────────────────────────────────────────────────
exports.updateProgramme = async (req, res, next) => {
  try {
    const { programme, department, faculty, degreeType, session } = req.body;
    if (!programme || !degreeType) {
      return res.status(400).json({ success: false, message: 'Programme and degree type are required.' });
    }

    const student = await Student.findByIdAndUpdate(
      req.student._id,
      { $set: { programme, department, faculty, degreeType, session: session || '2026/2027' } },
      { new: true }
    ).select('-password');

    res.json({ success: true, message: 'Programme choice saved.', student });
  } catch (err) {
    next(err);
  }
};

// ── UPDATE QUALIFICATIONS ─────────────────────────────────────────────────────
exports.updateQualifications = async (req, res, next) => {
  try {
    const { qualifications, oLevel } = req.body;
    const update = {};
    if (qualifications) update.qualifications = qualifications;
    if (oLevel) update.oLevel = oLevel;

    const student = await Student.findByIdAndUpdate(
      req.student._id, { $set: update }, { new: true }
    ).select('-password');

    res.json({ success: true, message: 'Qualifications saved.', student });
  } catch (err) {
    next(err);
  }
};

// ── UPLOAD DOCUMENT ───────────────────────────────────────────────────────────
exports.uploadDocument = async (req, res, next) => {
  try {
    const { docType } = req.params;
    const allowed = ['transcript', 'certificate', 'oLevelResult', 'passport', 'birthCert'];
    if (!allowed.includes(docType)) {
      return res.status(400).json({ success: false, message: 'Invalid document type.' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }

    const update = { [`documents.${docType}`]: req.file.filename };
    const student = await Student.findByIdAndUpdate(
      req.student._id, { $set: update }, { new: true }
    ).select('-password');

    res.json({ success: true, message: 'Document uploaded successfully.', filename: req.file.filename, student });
  } catch (err) {
    next(err);
  }
};

// ── SUBMIT APPLICATION ────────────────────────────────────────────────────────
exports.submitApplication = async (req, res, next) => {
  try {
    const student = await Student.findById(req.student._id);

    // Validate completeness
    if (!student.firstName || !student.lastName || !student.gender || !student.dateOfBirth) {
      return res.status(400).json({ success: false, message: 'Please complete your personal information before submitting.' });
    }
    if (!student.programme || !student.degreeType) {
      return res.status(400).json({ success: false, message: 'Please select a programme before submitting.' });
    }
    if (!student.qualifications || student.qualifications.length === 0) {
      return res.status(400).json({ success: false, message: 'Please add your academic qualifications.' });
    }
    if (student.paymentStatus !== 'paid') {
      return res.status(400).json({ success: false, message: 'Application fee payment is required before submission.' });
    }

    const updated = await Student.findByIdAndUpdate(
      student._id,
      { $set: { applicationStatus: 'submitted' } },
      { new: true }
    ).select('-password');

    // Send confirmation email
    try {
      await email.sendApplicationConfirmation(student.email, student.firstName, student.applicationNumber);
    } catch (e) {
      console.error('[EMAIL ERROR]', e.message);
    }

    res.json({ success: true, message: 'Application submitted successfully!', student: updated });
  } catch (err) {
    next(err);
  }
};

// ── CHECK STATUS ──────────────────────────────────────────────────────────────
exports.checkStatus = async (req, res, next) => {
  try {
    const { applicationNumber, email: appEmail } = req.body;
    if (!applicationNumber || !appEmail) {
      return res.status(400).json({ success: false, message: 'Application number and email are required.' });
    }

    const student = await Student.findOne({
      applicationNumber,
      email: appEmail.toLowerCase(),
    }).select('firstName lastName applicationNumber programme degreeType applicationStatus paymentStatus session createdAt');

    if (!student) {
      return res.status(404).json({ success: false, message: 'No application found with those details.' });
    }

    res.json({ success: true, application: student });
  } catch (err) {
    next(err);
  }
};
