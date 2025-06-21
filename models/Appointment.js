const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema(
  {
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: [true, "معرف الطبيب مطلوب"],
    },
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: [true, "معرف المريض مطلوب"],
    },
    slot: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "معرف الفترة الزمنية مطلوب"],
    },
    type: {
      type: String,
      enum: ["consultation", "procedure", "test", "medication"],
      required: [true, "نوع الموعد مطلوب"],
    },
    reason: {
      type: String,
      required: [true, "سبب الحجز مطلوب"],
      minlength: [10, "يجب أن يكون السبب 10 أحرف على الأقل"],
      maxlength: [500, "يجب أن يكون السبب أقل من 500 حرف"],
    },
    day: {
      type: String,
      enum: [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
      ],
      required: [true, "يوم الموعد مطلوب"],
    },
    startTime: {
      type: String,
      required: [true, "وقت البدء مطلوب"],
    },
    endTime: {
      type: String,
      required: [true, "وقت الانتهاء مطلوب"],
    },
    price: {
      type: Number,
      required: [true, "السعر مطلوب"],
      min: [0, "السعر لا يمكن أن يكون سالباً"],
    },
    status: {
      type: String,
      enum: ["confirmed", "cancelled", "completed"],
      default: "confirmed",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

module.exports = mongoose.model("Appointment", appointmentSchema);
