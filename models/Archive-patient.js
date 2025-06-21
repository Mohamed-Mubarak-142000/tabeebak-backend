const mongoose = require("mongoose");

const archiveSchema = new mongoose.Schema(
  {
    originalAppointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      required: true,
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
    },
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
    },
    type: {
      type: String,
      enum: ["consultation", "procedure", "test", "medication"],
      required: true,
    },

    reason: String,
    day: String,
    startTime: String,
    endTime: String,
    price: Number,
    doctorName: String,
    doctorSpecialization: String,
    patientName: String,
    patientPhone: String,
    completedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ArchivePatient", archiveSchema);
