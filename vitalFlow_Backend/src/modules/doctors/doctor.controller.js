const doctorService = require('./doctor.service');

// ─── GET /api/doctors/:id ──────────────────────────────────────────────────────
const getDoctorById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await doctorService.getDoctorById(id);
        res.json(result);
    } catch (error) {
        next(error);
    }
};

// ─── PUT /api/doctors/:id ──────────────────────────────────────────────────────
const updateDoctor = async (req, res, next) => {
    try {
        const { id } = req.params;

        // Only allow doctor to update their own profile
        if (req.user.sub !== id) {
            return res.status(403).json({ message: 'Forbidden: You can only update your own profile' });
        }

        const result = await doctorService.updateDoctor(id, req.body);
        res.json(result);
    } catch (error) {
        next(error);
    }
};

// ─── POST /api/doctors/pin/set ─────────────────────────────────────────────────
const setPin = async (req, res, next) => {
    try {
        const { pin } = req.body;

        if (!pin || !/^\d{4,6}$/.test(pin)) {
            return res.status(400).json({ message: 'PIN must be a numeric string of 4–6 digits' });
        }

        const doctorId = req.user.sub;
        const result = await doctorService.setPin(doctorId, pin);
        res.json(result);
    } catch (error) {
        next(error);
    }
};

// ─── POST /api/doctors/pin/verify ─────────────────────────────────────────────
const verifyPin = async (req, res, next) => {
    try {
        const { pin } = req.body;

        if (!pin || !/^\d{4,6}$/.test(pin)) {
            return res.status(400).json({ message: 'PIN must be a numeric string of 4–6 digits' });
        }

        const doctorId = req.user.sub;
        const result = await doctorService.verifyPin(doctorId, pin);
        res.json(result);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getDoctorById,
    updateDoctor,
    setPin,
    verifyPin,
};
