const express = require("express");
const {
  registerDoctor,
  loginDoctor,
  getDoctorProfile,
  registerPatient,
  loginPatient,
  getPatientProfile,
  logout,
  resetPasswordWithOTP,
  requestPasswordReset,
  requestPasswordResetPatient,
  resetPasswordWithOTPPatient,
} = require("../controllers/auth-controller");
const { protectDoctor, protectPatient } = require("../middleware/auth");

const router = express.Router();

// Doctor Routes
router.post("/doctor/register", registerDoctor);
router.post("/doctor/login", loginDoctor);
router.get("/doctor/me", protectDoctor, getDoctorProfile);

router.post("/request-password", requestPasswordReset);
router.post("/reset-password", resetPasswordWithOTP);

// Patient Routes
router.post("/patient/register", registerPatient);
router.post("/patient/login", loginPatient);
router.get("/patient/me", protectPatient, getPatientProfile);
router.post("/request-password-patient", requestPasswordResetPatient);
router.post("/reset-password-patient", resetPasswordWithOTPPatient);

// Common Logout
router.post("/logout", logout);

module.exports = router;
