const asyncHandler = require("express-async-handler");
const Appointment = require("../models/Appointment");
const Doctor = require("../models/Doctor");
const Patient = require("../models/Patient");
const Archive = require("../models/Archive-patient");
const mongoose = require("mongoose");
const ArchivePatient = require("../models/Archive-patient");

const createAppointment = asyncHandler(async (req, res) => {
  const {
    doctor,
    slot,
    patient,
    type,
    reason,
    day,
    startTime,
    endTime,
    price,
  } = req.body;

  console.log("req.body", req.body);
  if (
    !doctor ||
    !slot ||
    !patient ||
    !type ||
    !reason ||
    !day ||
    !startTime ||
    !endTime ||
    price === undefined
  ) {
    return res.status(400).json({
      success: false,
      message: "جميع الحقول المطلوبة يجب أن تكون موجودة",
    });
  }

  if (isNaN(price)) {
    return res.status(400).json({
      success: false,
      message: "السعر يجب أن يكون رقماً",
    });
  }

  const doctorExists = await Doctor.findById(doctor);
  if (!doctorExists) {
    return res.status(404).json({
      success: false,
      message: "الطبيب غير موجود",
    });
  }

  const patientExists = await Patient.findById(patient);
  if (!patientExists) {
    return res.status(404).json({
      success: false,
      message: "المريض غير موجود",
    });
  }

  const slotExists = doctorExists.availableSlots.id(slot);
  if (!slotExists || !slotExists.isAvailable) {
    return res.status(400).json({
      success: false,
      message: "الفترة الزمنية غير متاحة",
    });
  }

  try {
    slotExists.isAvailable = false;

    const appointment = await Appointment.create({
      doctor,
      patient,
      slot,
      type,
      reason,
      day,
      startTime,
      endTime,
      price: Number(price),
      status: "confirmed",
    });

    await doctorExists.save();

    res.status(201).json({
      success: true,
      data: appointment,
    });
  } catch (error) {
    console.error("خطأ في إنشاء الموعد:", error);
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء إنشاء الموعد",
      error: error.message,
    });
  }
});

const getDoctorAppointments = asyncHandler(async (req, res) => {
  const { doctorId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(doctorId)) {
    return res.status(400).json({
      success: false,
      message: "معرف الطبيب غير صالح",
    });
  }

  try {
    const appointments = await Appointment.find({ doctor: doctorId })
      .populate("patient", "name email phone") // يمكنك تعديل الحقول حسب احتياجاتك
      .sort({ createdAt: -1 }); // لترتيب المواعيد من الأحدث إلى الأقدم

    res.status(200).json({
      success: true,
      count: appointments.length,
      data: appointments,
    });
  } catch (error) {
    console.error("خطأ في جلب مواعيد الطبيب:", error);
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء جلب مواعيد الطبيب",
      error: error.message,
    });
  }
});

const updateAppointmentStatus = asyncHandler(async (req, res) => {
  const { appointmentId } = req.params;
  const { status } = req.body;

  if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
    return res.status(400).json({
      success: false,
      message: "معرف الموعد غير صالح",
    });
  }

  const validStatuses = ["confirmed", "cancelled", "completed"];
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message:
        "الحالة المطلوبة غير صالحة (يجب أن تكون confirmed أو cancelled أو completed)",
    });
  }

  try {
    const appointment = await Appointment.findById(appointmentId)
      .populate("doctor", "name specialization")
      .populate("patient", "name phone");

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "الموعد غير موجود",
      });
    }

    let result;

    if (status === "completed") {
      const archivedAppointment = await Archive.create({
        originalAppointmentId: appointment._id,
        doctor: appointment.doctor._id,
        patient: appointment.patient._id,
        type: appointment.type,
        reason: appointment.reason,
        day: appointment.day,
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        price: appointment.price,
        status: "completed",
        doctorName: appointment.doctor.name,
        doctorSpecialization: appointment.doctor.specialization,
        patientName: appointment.patient.name,
        patientPhone: appointment.patient.phone,
      });

      await Appointment.findByIdAndDelete(appointmentId);

      await Patient.findByIdAndUpdate(appointment.patient._id, {
        $addToSet: { completedAppointments: archivedAppointment._id },
      });

      result = archivedAppointment;
    } else {
      appointment.status = status;
      await appointment.save();
      result = appointment;

      if (status === "cancelled") {
        const doctor = await Doctor.findById(appointment.doctor);
        const slot = doctor.availableSlots.id(appointment.slot);
        if (slot) {
          slot.isAvailable = true;
          await doctor.save();
        }
      }
    }

    res.status(200).json({
      success: true,
      message: `تم ${status === "completed" ? "أرشفة" : "تحديث"} الموعد بنجاح`,
      data: result,
    });
  } catch (error) {
    console.error("خطأ في تحديث حالة الموعد:", error);
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء تحديث حالة الموعد",
      error: error.message,
    });
  }
});

const getDoctorPatients = asyncHandler(async (req, res) => {
  const { doctorId } = req.params;
  const { search } = req.query;

  if (!mongoose.Types.ObjectId.isValid(doctorId)) {
    return res.status(400).json({
      success: false,
      message: "معرف الطبيب غير صالح",
    });
  }

  try {
    // جلب المرضى من المواعيد الجارية والأرشيف
    const currentAppointments = await Appointment.find({
      doctor: doctorId,
    }).select("patient");
    const archivedAppointments = await Archive.find({
      doctor: doctorId,
    }).select("patient");

    const allPatientIds = [
      ...currentAppointments.map((a) => a.patient.toString()),
      ...archivedAppointments.map((a) => a.patient.toString()),
    ];

    const uniquePatientIds = [...new Set(allPatientIds)];

    const filter = {
      _id: { $in: uniquePatientIds },
      ...(search && {
        name: { $regex: search, $options: "i" }, // تأكد من أن الحقل فعلاً "name"
      }),
    };

    const patients = await Patient.find(filter);

    res.status(200).json({
      success: true,
      count: patients.length,
      data: patients,
    });
  } catch (error) {
    console.error("خطأ في جلب مرضى الطبيب:", error);
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء جلب المرضى",
      error: error.message,
    });
  }
});

const getDoctorAppointment = asyncHandler(async (req, res) => {
  const { appointmentId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
    return res.status(400).json({
      success: false,
      message: "معرف الموعد غير صالح",
    });
  }

  try {
    const appointment = await Appointment.findById(appointmentId).populate(
      "patient"
    ); // هذا هو المطلوب لجلب بيانات المريض

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "الموعد غير موجود",
      });
    }

    res.status(200).json({
      success: true,
      data: appointment,
    });
  } catch (error) {
    console.error("خطأ في جلب الموعد:", error);
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء جلب الموعد",
      error: error.message,
    });
  }
});

const getDoctorAppointmentFromArchive = asyncHandler(async (req, res) => {
  const { archiveId } = req.params;

  try {
    const archive = await ArchivePatient.findById(archiveId);

    res.status(200).json({
      success: true,
      data: archive,
    });
  } catch (error) {
    console.error("خطأ في جلب الموعد:", error);
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء جلب الموعد",
      error: error.message,
    });
  }
});

const getPatientAppointments = asyncHandler(async (req, res) => {
  const { patientId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(patientId)) {
    return res.status(400).json({
      success: false,
      message: "معرف المريض غير صالح",
    });
  }

  try {
    const appointments = await Appointment.find({ patient: patientId })
      .populate("doctor", "name specialization photo")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: appointments.length,
      data: appointments,
    });
  } catch (error) {
    console.error("خطأ في جلب مواعيد المريض:", error);
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء جلب مواعيد المريض",
      error: error.message,
    });
  }
});

const updateAppointmentPatientStatus = asyncHandler(async (req, res) => {
  const { appointmentId } = req.params;
  const { status } = req.body;
  const { _id: userId, role } = req.user; // افترضنا وجود معلومات المستخدم المصادق

  if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
    return res.status(400).json({
      success: false,
      message: "معرف الموعد غير صالح",
    });
  }

  const validStatuses = ["confirmed", "cancelled", "completed"];
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message:
        "الحالة المطلوبة غير صالحة (يجب أن تكون confirmed أو cancelled أو completed)",
    });
  }

  try {
    const appointment = await Appointment.findById(appointmentId)
      .populate("doctor", "name availableSlots")
      .populate("patient", "name phone");

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "الموعد غير موجود",
      });
    }

    // التحقق من صلاحية المستخدم لتعديل الموعد
    if (role === "patient" && !appointment.patient._id.equals(userId)) {
      return res.status(403).json({
        success: false,
        message: "ليس لديك صلاحية لتعديل هذا الموعد",
      });
    }

    let result;

    if (status === "completed") {
      // أرشفة الموعد المكتمل
      const archivedAppointment = await Archive.create({
        originalAppointmentId: appointment._id,
        doctor: appointment.doctor._id,
        patient: appointment.patient._id,
        type: appointment.type,
        reason: appointment.reason,
        day: appointment.day,
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        price: appointment.price,
        status: "completed",
        doctorName: appointment.doctor.name,
        patientName: appointment.patient.name,
        patientPhone: appointment.patient.phone,
      });

      // إضافة الموعد المكتمل إلى سجل المريض
      await Patient.findByIdAndUpdate(appointment.patient._id, {
        $addToSet: { completedAppointments: archivedAppointment._id },
      });

      // حذف الموعد من المواعيد الحالية
      await Appointment.findByIdAndDelete(appointmentId);

      result = archivedAppointment;
    } else if (status === "cancelled") {
      // إلغاء الموعد
      const doctor = await Doctor.findById(appointment.doctor._id);

      // إعادة الفترة الزمنية إلى القائمة المتاحة
      if (appointment.slot && doctor.availableSlots) {
        const slot = doctor.availableSlots.id(appointment.slot);
        if (slot) {
          slot.isAvailable = true;
          await doctor.save();
        }
      }

      // حذف الموعد نهائياً كما طلبت
      await Appointment.findByIdAndDelete(appointmentId);

      result = { message: "تم إلغاء الموعد وحذفه بنجاح" };
    } else {
      // تحديث الحالة فقط (confirmed)
      appointment.status = status;
      await appointment.save();
      result = appointment;
    }

    res.status(200).json({
      success: true,
      message: `تم ${
        status === "completed"
          ? "أرشفة"
          : status === "cancelled"
          ? "إلغاء وحذف"
          : "تحديث"
      } الموعد بنجاح`,
      data: result,
    });
  } catch (error) {
    console.error("خطأ في تحديث حالة الموعد:", error);
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء تحديث حالة الموعد",
      error: error.message,
    });
  }
});

module.exports = {
  createAppointment,
  getDoctorAppointments,
  updateAppointmentStatus,
  getDoctorPatients,
  getDoctorAppointment,
  getPatientAppointments,
  updateAppointmentPatientStatus,

  getDoctorAppointmentFromArchive,
};
