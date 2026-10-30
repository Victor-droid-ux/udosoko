'use strict';
require('dotenv').config();
const mongoose = require('mongoose');
const Admin    = require('./models/Admin');

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const exists = await Admin.findOne({ role: 'superadmin' });
  if (exists) {
    console.log('Admin already exists:', exists.email);
    process.exit(0);
  }

  const admin = await Admin.create({
    name:     'Super Admin',
    email:    process.env.ADMIN_EMAIL || 'admin@udusok.edu.ng',
    password: process.env.ADMIN_PASSWORD || 'Admin@123456',
    role:     'superadmin',
  });

  console.log('✅ Admin created:');
  console.log('   Email:   ', admin.email);
  console.log('   Password:', process.env.ADMIN_PASSWORD || 'Admin@123456');
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
