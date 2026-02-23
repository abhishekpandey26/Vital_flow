const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../../config/db');
const transporter = require('../../config/mailer');
require('dotenv').config();

const sendOtp = async (email, otp) => {
    const mailOptions = {
        from: process.env.EMAIL_SENDER,
        to: email,
        subject: 'Your VitalsFlow Login OTP',
        html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #2563eb; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">VitalsFlow</h1>
        </div>
        <div style="padding: 30px; color: #1e293b;">
          <h2 style="font-size: 20px; margin-bottom: 20px;">Doctor Authentication</h2>
          <p style="margin-bottom: 20px;">Use the following OTP to log in to your VitalsFlow account. This OTP is valid for 5 minutes.</p>
          <div style="background-color: #f8fafc; border: 1px dashed #2563eb; padding: 20px; text-align: center; border-radius: 8px;">
            <span style="font-size: 32px; font-weight: bold; color: #2563eb; letter-spacing: 5px;">${otp}</span>
          </div>
          <p style="margin-top: 20px; font-size: 14px; color: #64748b;">
            If you did not request this, please ignore this email.
          </p>
        </div>
        <div style="background-color: #f1f5f9; padding: 15px; text-align: center; font-size: 12px; color: #94a3b8;">
          &copy; 2024 VitalsFlow HealthTech Platform. All rights reserved.
        </div>
      </div>
    `,
    };

    try {
        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error('Error sending email:', error);
        throw { status: 500, message: 'Failed to send OTP email' };
    }
};

const login = async (email) => {
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Invalidate previous OTPs
    await db.query(
        'UPDATE otp_sessions SET used = TRUE WHERE email = $1 AND used = FALSE',
        [email]
    );

    // Store new OTP
    await db.query(
        'INSERT INTO otp_sessions (email, otp_hash, expires_at) VALUES ($1, $2, $3)',
        [email, otpHash, expiresAt]
    );

    // Send OTP (Mockable for future SMS/WhatsApp)
    await sendOtp(email, otp);

    return { message: 'OTP sent successfully' };
};

const verify = async (email, otp) => {
    // Fetch latest unused, non-expired OTP session
    const res = await db.query(
        'SELECT * FROM otp_sessions WHERE email = $1 AND used = FALSE AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
        [email]
    );

    const session = res.rows[0];

    if (!session) {
        throw { status: 401, message: 'OTP expired or not found' };
    }

    if (session.attempts >= 3) {
        throw { status: 429, message: 'Too many failed attempts. Request a new OTP.' };
    }

    const isMatch = await bcrypt.compare(otp, session.otp_hash);

    if (!isMatch) {
        await db.query(
            'UPDATE otp_sessions SET attempts = attempts + 1 WHERE id = $1',
            [session.id]
        );
        throw { status: 401, message: 'Invalid OTP' };
    }

    // Mark OTP as used
    await db.query('UPDATE otp_sessions SET used = TRUE WHERE id = $1', [session.id]);

    // Upsert doctor record
    const doctorRes = await db.query(
        `INSERT INTO doctors (email) VALUES ($1)
     ON CONFLICT (email) DO UPDATE SET updated_at = NOW()
     RETURNING *`,
        [email]
    );

    const doctor = doctorRes.rows[0];

    // Sign JWT
    const accessToken = jwt.sign(
        { sub: doctor.id, email: doctor.email },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    return { accessToken };
};

const getMe = async (doctorId) => {
    const res = await db.query(
        `SELECT 
      id, name, email, phone, registration_no, specialization, 
      clinic_name, clinic_address, clinic_logo_url, 
      abha_id, pin_set, is_verified, created_at 
     FROM doctors WHERE id = $1`,
        [doctorId]
    );

    if (res.rows.length === 0) {
        throw { status: 404, message: 'Doctor profile not found' };
    }

    return res.rows[0];
};

module.exports = {
    login,
    verify,
    getMe,
};
