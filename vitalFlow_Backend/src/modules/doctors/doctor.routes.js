const express = require('express');
const router = express.Router();
const doctorController = require('./doctor.controller');
const { protect } = require('../../middlewares/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: Doctors
 *   description: Doctor profile, clinic details, and PIN management for prescription signing
 */

/**
 * @swagger
 * /api/doctors/{id}:
 *   get:
 *     summary: Fetch doctor profile
 *     description: Returns doctor name, registration number, clinic info, and logo — used in the Rx (prescription) header.
 *     tags: [Doctors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: "Your doctor UUID — get it from /api/auth/me (the 'id' field)"
 *     responses:
 *       200:
 *         description: Doctor profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                   example: a1b2c3d4-e5f6-7890-abcd-ef1234567890
 *                 name:
 *                   type: string
 *                   example: Dr. Priya Sharma
 *                 email:
 *                   type: string
 *                   example: priya@vitalsflow.in
 *                 phone:
 *                   type: string
 *                   example: "+919876543210"
 *                 registration_no:
 *                   type: string
 *                   example: MCI-2021-DL-12345
 *                 specialization:
 *                   type: string
 *                   example: Cardiologist
 *                 clinic_name:
 *                   type: string
 *                   example: HeartCare Clinic
 *                 clinic_address:
 *                   type: string
 *                   example: 12, Connaught Place, New Delhi
 *                 clinic_logo_url:
 *                   type: string
 *                   example: https://cdn.vitalsflow.in/logos/heartcare.png
 *                 abha_id:
 *                   type: string
 *                   example: 12-3456-7890-1234
 *                 pin_set:
 *                   type: boolean
 *                   example: true
 *                 is_verified:
 *                   type: boolean
 *                   example: true
 *                 created_at:
 *                   type: string
 *                   format: date-time
 *       401:
 *         description: Not authorized
 *       404:
 *         description: Doctor not found
 *       500:
 *         description: Internal server error
 */
router.get('/:id', protect, doctorController.getDoctorById);

/**
 * @swagger
 * /api/doctors/{id}:
 *   put:
 *     summary: Update doctor profile
 *     description: Update doctor profile, clinic info, and settings. A doctor can only update their own profile.
 *     tags: [Doctors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: "Your doctor UUID — must match the JWT token owner. Get it from /api/auth/me"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Dr. Priya Sharma
 *               phone:
 *                 type: string
 *                 example: "+919876543210"
 *               registration_no:
 *                 type: string
 *                 example: MCI-2021-DL-12345
 *               specialization:
 *                 type: string
 *                 example: Cardiologist
 *               clinic_name:
 *                 type: string
 *                 example: HeartCare Clinic
 *               clinic_address:
 *                 type: string
 *                 example: 12, Connaught Place, New Delhi
 *               clinic_logo_url:
 *                 type: string
 *                 example: https://cdn.vitalsflow.in/logos/heartcare.png
 *               abha_id:
 *                 type: string
 *                 example: 12-3456-7890-1234
 *     responses:
 *       200:
 *         description: Doctor profile updated successfully
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
 *                 clinic_address:
 *                   type: string
 *                 clinic_logo_url:
 *                   type: string
 *                 abha_id:
 *                   type: string
 *                 pin_set:
 *                   type: boolean
 *                 is_verified:
 *                   type: boolean
 *                 updated_at:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: No valid fields provided for update
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden — cannot update another doctor's profile
 *       404:
 *         description: Doctor not found
 *       500:
 *         description: Internal server error
 */
router.put('/:id', protect, doctorController.updateDoctor);

/**
 * @swagger
 * /api/doctors/pin/set:
 *   post:
 *     summary: Set prescription signing PIN
 *     description: Set a 4–6 digit numeric signing PIN on first login. PIN cannot be changed via this endpoint once set.
 *     tags: [Doctors]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - pin
 *             properties:
 *               pin:
 *                 type: string
 *                 minLength: 4
 *                 maxLength: 6
 *                 pattern: '^\d{4,6}$'
 *                 example: "1234"
 *     responses:
 *       200:
 *         description: PIN set successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: PIN set successfully
 *       400:
 *         description: Invalid PIN format or PIN already set
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: PIN already set. Use reset flow.
 *       401:
 *         description: Not authorized
 *       500:
 *         description: Internal server error
 */
router.post('/pin/set', protect, doctorController.setPin);

/**
 * @swagger
 * /api/doctors/pin/verify:
 *   post:
 *     summary: Verify prescription signing PIN
 *     description: Standalone PIN verification check before prescription sign-off. Used to confirm doctor identity before signing.
 *     tags: [Doctors]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - pin
 *             properties:
 *               pin:
 *                 type: string
 *                 minLength: 4
 *                 maxLength: 6
 *                 pattern: '^\d{4,6}$'
 *                 example: "1234"
 *     responses:
 *       200:
 *         description: PIN verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 verified:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Invalid PIN format or PIN not yet set
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: PIN has not been set yet. Please set a PIN first.
 *       401:
 *         description: Invalid PIN or not authorized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Invalid PIN
 *       500:
 *         description: Internal server error
 */
router.post('/pin/verify', protect, doctorController.verifyPin);

module.exports = router;
