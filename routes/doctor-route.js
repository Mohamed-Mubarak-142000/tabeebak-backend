const express = require("express");
const {
  getDoctors,
  getDoctor,
  updateDoctor,
  getDoctorsBySpecialtyAndGovernorate,
  getDashboardStats,
  getAppointmentStats,
  getPatientStats,
  getRevenueStats,
  addAvailableSlot,
  updateAvailableSlot,
  deleteAvailableSlot,
  getAvailableSlots,
  getRatingStats,
  getAvailableSlotsStats,
  toggleSlotAvailability,
} = require("../controllers/doctor-controller");
const {
  getReviews,
  addReview,
  deleteReview,
} = require("../controllers/review-controller");
const { protectPatient } = require("../middleware/auth");
const { protectDoctor } = require("../middleware/auth");
const upload = require("../config/multer");

const router = express.Router();

router.get("/", getDoctors);
router.get("/filter", getDoctorsBySpecialtyAndGovernorate);
router.get("/doctor-details/:id", getDoctor);

// Doctor-only routes
router.put("/:id", protectDoctor, upload.single("photo"), updateDoctor);

// Review routes
router.get("/:id/reviews", getReviews);
router.post("/:id/reviews", protectPatient, addReview);
router.delete("/reviews/:id", protectPatient, deleteReview);

/***** */
router.get("/stats", protectDoctor, getDashboardStats);
router.get("/appointments/stats", protectDoctor, getAppointmentStats);
router.get("/patients/stats", protectDoctor, getPatientStats);
router.get("/revenue/stats", protectDoctor, getRevenueStats);
router.get("/rating/stats", protectDoctor, getRatingStats);
router.get("/available-slots/stats", protectDoctor, getAvailableSlotsStats);
/***** */
router.get("/all-slots/:doctorId", getAvailableSlots);
router.post("/slots", protectDoctor, addAvailableSlot);
router.put("/slots/:slotId", protectDoctor, updateAvailableSlot);
router.delete("/slots/:slotId", protectDoctor, deleteAvailableSlot);
router.put(
  "/slots/:slotId/availability",
  protectDoctor,
  toggleSlotAvailability
);

module.exports = router;
