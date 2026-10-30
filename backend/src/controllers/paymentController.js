'use strict';
const https   = require('https');
const Student = require('../models/Student');

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
const APPLICATION_FEE = parseInt(process.env.APPLICATION_FEE || '15000'); // NGN

function paystackRequest(method, path, data) {
  return new Promise((resolve, reject) => {
    const body    = data ? JSON.stringify(data) : null;
    const options = {
      hostname: 'api.paystack.co',
      path,
      method,
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`,
        'Content-Type': 'application/json',
        ...(body && { 'Content-Length': Buffer.byteLength(body) }),
      },
    };
    const req = https.request(options, res => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(raw)); }
        catch { reject(new Error('Invalid Paystack response')); }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

// ── INITIALIZE PAYMENT ────────────────────────────────────────────────────────
exports.initializePayment = async (req, res, next) => {
  try {
    const student  = req.student;
    const callback = `${process.env.SITE_URL || 'http://localhost:5000'}/payment/verify`;

    if (student.paymentStatus === 'paid') {
      return res.status(400).json({ success: false, message: 'Application fee has already been paid.' });
    }

    if (!PAYSTACK_SECRET || PAYSTACK_SECRET.includes('your_')) {
      // Dev mode — simulate payment
      console.log(`[PAYMENT DEV] Simulating ₦${APPLICATION_FEE} payment for ${student.email}`);
      const fakeRef = `DEV-${Date.now()}-${student._id}`;
      await Student.findByIdAndUpdate(student._id, {
        $set: {
          paymentStatus: 'paid',
          paymentRef:    fakeRef,
          paymentDate:   new Date(),
          paymentAmount: APPLICATION_FEE,
          applicationStatus: 'awaiting_payment' === student.applicationStatus ? 'incomplete' : student.applicationStatus,
        }
      });
      return res.json({
        success:    true,
        devMode:    true,
        message:    `Dev mode: Payment of ₦${APPLICATION_FEE.toLocaleString()} simulated successfully.`,
        reference:  fakeRef,
      });
    }

    const response = await paystackRequest('POST', '/transaction/initialize', {
      email:     student.email,
      amount:    APPLICATION_FEE * 100, // Paystack uses kobo
      reference: `UDUSOK-PG-${student._id}-${Date.now()}`,
      callback_url: callback,
      metadata: {
        studentId:         student._id.toString(),
        applicationNumber: student.applicationNumber,
        firstName:         student.firstName,
        lastName:          student.lastName,
      },
    });

    if (!response.status) {
      return res.status(400).json({ success: false, message: response.message || 'Payment initialization failed.' });
    }

    // Save pending reference
    await Student.findByIdAndUpdate(student._id, {
      $set: { paymentRef: response.data.reference, applicationStatus: 'awaiting_payment' }
    });

    res.json({
      success:      true,
      authorizationUrl: response.data.authorization_url,
      reference:    response.data.reference,
      amount:       APPLICATION_FEE,
    });
  } catch (err) {
    next(err);
  }
};

// ── VERIFY PAYMENT ────────────────────────────────────────────────────────────
exports.verifyPayment = async (req, res, next) => {
  try {
    const { reference } = req.query;
    if (!reference) return res.status(400).json({ success: false, message: 'Reference is required.' });

    if (!PAYSTACK_SECRET || PAYSTACK_SECRET.includes('your_')) {
      return res.redirect('/dashboard?payment=success');
    }

    const response = await paystackRequest('GET', `/transaction/verify/${reference}`);

    if (!response.status || response.data.status !== 'success') {
      return res.redirect('/dashboard?payment=failed');
    }

    const { metadata, amount } = response.data;
    await Student.findByIdAndUpdate(metadata.studentId, {
      $set: {
        paymentStatus: 'paid',
        paymentRef:    reference,
        paymentDate:   new Date(),
        paymentAmount: amount / 100,
      }
    });

    res.redirect('/dashboard?payment=success');
  } catch (err) {
    next(err);
  }
};

// ── GET PAYMENT STATUS ────────────────────────────────────────────────────────
exports.getPaymentStatus = async (req, res) => {
  const student = await Student.findById(req.student._id).select('paymentStatus paymentRef paymentDate paymentAmount');
  res.json({ success: true, payment: student });
};
