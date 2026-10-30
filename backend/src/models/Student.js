'use strict';
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const studentSchema = new mongoose.Schema({
  // Auth
  email:       { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:    { type: String, required: true, minlength: 6 },
  isVerified:  { type: Boolean, default: false },
  verifyToken: { type: String },
  resetToken:  { type: String },
  resetExpiry: { type: Date },

  // Personal Info
  firstName:     { type: String, required: true, trim: true },
  lastName:      { type: String, required: true, trim: true },
  middleName:    { type: String, trim: true },
  gender:        { type: String, enum: ['Male', 'Female'] },
  dateOfBirth:   { type: Date },
  phone:         { type: String, trim: true },
  nationality:   { type: String, default: 'Nigerian' },
  stateOfOrigin: { type: String },
  lga:           { type: String },
  address:       { type: String },

  // Application
  applicationNumber: { type: String, unique: true, sparse: true },
  programme:    { type: String },
  department:   { type: String },
  faculty:      { type: String },
  degreeType:   { type: String, enum: ['PhD', 'MPhil', 'Masters', 'PGDiploma', 'MPH'] },
  session:      { type: String, default: '2026/2027' },

  // Qualifications
  qualifications: [{
    degree:         String,
    institution:    String,
    graduationYear: Number,
    cgpa:           String,
    classification: String,
  }],

  // O'Level
  oLevel: [{
    subject:  String,
    grade:    String,
    year:     Number,
    examType: { type: String, enum: ['WAEC', 'NECO', 'GCE', 'NABTEB'] },
  }],

  // Documents (file paths)
  documents: {
    transcript:   { type: String },
    certificate:  { type: String },
    oLevelResult: { type: String },
    passport:     { type: String },
    birthCert:    { type: String },
  },

  // Payment
  paymentStatus: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
  paymentRef:    { type: String },
  paymentDate:   { type: Date },
  paymentAmount: { type: Number },

  // Application Status
  applicationStatus: {
    type: String,
    enum: ['incomplete', 'awaiting_payment', 'submitted', 'under_review', 'admitted', 'rejected'],
    default: 'incomplete',
  },
  adminRemarks: { type: String },
  admittedDate: { type: Date },

  // Meta
  loginAttempts: { type: Number, default: 0 },
  lockUntil:     { type: Date },
  lastLogin:     { type: Date },
}, { timestamps: true });

// Hash password before save
studentSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, parseInt(process.env.BCRYPT_ROUNDS) || 12);
  next();
});

// Generate application number
studentSchema.pre('save', async function(next) {
  if (!this.applicationNumber) {
    const year  = new Date().getFullYear();
    const rand  = Math.floor(100000 + Math.random() * 900000);
    this.applicationNumber = `UDUSOK/PG/${year}/${rand}`;
  }
  next();
});

studentSchema.methods.comparePassword = async function(password) {
  return bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('Student', studentSchema);
