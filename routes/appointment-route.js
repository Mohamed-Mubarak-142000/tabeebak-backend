const express = require("express");
const {
  createAppointment,
  getDoctorAppointments,
  updateAppointmentStatus,
  getDoctorPatients,
  getDoctorAppointment,
  getDoctorAppointmentFromArchive,
  getPatientAppointments,
  updateAppointmentPatientStatus,
} = require("../controllers/appointment-controller");
const { protectPatient, protectDoctor } = require("../middleware/auth");
const {
  getCompletedAppointments,
} = require("../controllers/archiev-controller");

const router = express.Router();

// Patient routes
router.post("/", protectPatient, createAppointment);
router.get("/doctor/:doctorId", protectDoctor, getDoctorAppointments);
router.patch("/:appointmentId/status", protectDoctor, updateAppointmentStatus);
router.get("/archive/:doctorId", protectDoctor, getCompletedAppointments);
router.get("/archive-details/:archiveId", getDoctorAppointmentFromArchive);
router.get("/doctor/:doctorId/patients", getDoctorPatients);

router.get("/appointment-details/:appointmentId", getDoctorAppointment);

// جلب مواعيد المريض
router.get("/patient/:patientId", protectPatient, getPatientAppointments);

// تحديث حالة الموعد
router.put(
  "patient/:appointmentId/status",
  protectPatient,
  updateAppointmentPatientStatus
);

module.exports = router;
