const authService = require('./auth.service');

const login = async (req, res, next) => {
    try {
        const { email } = req.body;
        if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
            return res.status(400).json({ message: 'Invalid email format' });
        }

        const result = await authService.login(email);
        res.json(result);
    } catch (error) {
        next(error);
    }
};

const verify = async (req, res, next) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp || otp.length !== 6) {
            return res.status(400).json({ message: 'Email and 6-digit OTP are required' });
        }

        const result = await authService.verify(email, otp);
        res.json(result);
    } catch (error) {
        next(error);
    }
};

const getMe = async (req, res, next) => {
    try {
        const doctorId = req.user.sub;
        const result = await authService.getMe(doctorId);
        res.json(result);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    login,
    verify,
    getMe,
};
