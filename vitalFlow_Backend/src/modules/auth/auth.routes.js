const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const { protect } = require('../../middlewares/auth.middleware');

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Request login OTP
 *     description: Sends a 6-digit OTP to the provided doctor email address for authentication.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: doctor@example.com
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: OTP sent successfully
 *       400:
 *         description: Invalid email format
 *       500:
 *         description: Internal server error
 */
router.post('/login', authController.login);

/**
 * @swagger
 * /api/auth/verify:
 *   post:
 *     summary: Verify OTP and login
 *     description: Verifies the 6-digit OTP and returns a JWT access token. Upserts doctor record.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: doctor@example.com
 *               otp:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Successfully verified
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *       401:
 *         description: Invalid OTP or expired
 *       429:
 *         description: Too many failed attempts
 *       500:
 *         description: Internal server error
 */
router.post('/verify', authController.verify);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current doctor profile
 *     description: Returns the profile data of the currently authenticated doctor.
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Doctor profile retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 name:
 *                   type: string
 *                 email:
 *                   type: string
 *                 phone:
 *                   type: string
 *                 registration_no:
 *                   type: string
 *                 specialization:
 *                   type: string
 *                 clinic_name:
 *                   type: string
 *                 is_verified:
 *                   type: boolean
 *                 created_at:
 *                   type: string
 *                   format: date-time
 *       401:
 *         description: Not authorized
 *       404:
 *         description: Profile not found
 *       500:
 *         description: Internal server error
 */
router.get('/me', protect, authController.getMe);

module.exports = router;
