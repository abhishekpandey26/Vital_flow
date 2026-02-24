const bcrypt = require('bcrypt');
const db = require('../../config/db');

// ─── GET Doctor Profile ────────────────────────────────────────────────────────
const getDoctorById = async (id) => {
    const res = await db.query(
        `SELECT 
            id, name, email, phone, registration_no, specialization,
            clinic_name, clinic_address, clinic_logo_url,
            abha_id, pin_set, is_verified, created_at
         FROM doctors WHERE id = $1`,
        [id]
    );

    if (res.rows.length === 0) {
        throw { status: 404, message: 'Doctor not found' };
    }

    return res.rows[0];
};

// ─── UPDATE Doctor Profile ─────────────────────────────────────────────────────
const updateDoctor = async (id, fields) => {
    const allowedFields = [
        'name', 'phone', 'registration_no', 'specialization',
        'clinic_name', 'clinic_address', 'clinic_logo_url', 'abha_id',
    ];

    // Filter only allowed & provided fields
    const updates = {};
    for (const key of allowedFields) {
        if (fields[key] !== undefined) {
            updates[key] = fields[key];
        }
    }

    if (Object.keys(updates).length === 0) {
        throw { status: 400, message: 'No valid fields provided for update' };
    }

    // Build dynamic SET clause: name = $1, phone = $2, ...
    const setClauses = Object.keys(updates).map((key, idx) => `${key} = $${idx + 1}`);
    setClauses.push(`updated_at = NOW()`);

    const values = Object.values(updates);
    values.push(id); // last param for WHERE id = $N

    const query = `
        UPDATE doctors
        SET ${setClauses.join(', ')}
        WHERE id = $${values.length}
        RETURNING id, name, email, phone, registration_no, specialization,
                  clinic_name, clinic_address, clinic_logo_url,
                  abha_id, pin_set, is_verified, created_at, updated_at
    `;

    const res = await db.query(query, values);

    if (res.rows.length === 0) {
        throw { status: 404, message: 'Doctor not found' };
    }

    return res.rows[0];
};

// ─── SET Signing PIN ───────────────────────────────────────────────────────────
const setPin = async (doctorId, pin) => {
    // Check if PIN already set
    const existing = await db.query(
        'SELECT pin_set FROM doctors WHERE id = $1',
        [doctorId]
    );

    if (existing.rows.length === 0) {
        throw { status: 404, message: 'Doctor not found' };
    }

    if (existing.rows[0].pin_set) {
        throw { status: 400, message: 'PIN already set. Use reset flow.' };
    }

    const pinHash = await bcrypt.hash(pin, 10);

    await db.query(
        'UPDATE doctors SET pin_hash = $1, pin_set = TRUE, updated_at = NOW() WHERE id = $2',
        [pinHash, doctorId]
    );

    return { message: 'PIN set successfully' };
};

// ─── VERIFY Signing PIN ────────────────────────────────────────────────────────
const verifyPin = async (doctorId, pin) => {
    const res = await db.query(
        'SELECT pin_hash, pin_set FROM doctors WHERE id = $1',
        [doctorId]
    );

    if (res.rows.length === 0) {
        throw { status: 404, message: 'Doctor not found' };
    }

    const { pin_hash, pin_set } = res.rows[0];

    if (!pin_set || !pin_hash) {
        throw { status: 400, message: 'PIN has not been set yet. Please set a PIN first.' };
    }

    const isMatch = await bcrypt.compare(pin, pin_hash);

    if (!isMatch) {
        throw { status: 401, message: 'Invalid PIN' };
    }

    return { verified: true };
};

module.exports = {
    getDoctorById,
    updateDoctor,
    setPin,
    verifyPin,
};
