const expressAsyncHandler = require("express-async-handler");
const mongoose = require("mongoose");
const ArchivePatient = require("../models/Archive-patient");

const getCompletedAppointments = expressAsyncHandler(async (req, res) => {
  const { doctorId } = req.params;
  const { patientName } = req.query;

  try {
    if (!mongoose.Types.ObjectId.isValid(doctorId)) {
      return res.status(400).json({
        success: false,
        message: "معرف الطبيب غير صالح",
      });
    }

    let query = {
      doctor: doctorId,
    };

    if (patientName) {
      query.patientName = { $regex: patientName, $options: "i" };
    }

    const appointments = await ArchivePatient.find(query)
      .sort({
        day: -1,
        startTime: -1,
      })
      .populate("patient", "name phone")
      .populate("doctor", "name specialization");

    res.status(200).json({
      success: true,
      count: appointments.length,
      data: appointments,
    });
  } catch (error) {
    console.error("خطأ في جلب المواعيد المكتملة:", error);
    res.status(500).json({
      success: false,
      message: "حدث خطأ في جلب المواعيد المكتملة",
      error: error.message,
    });
  }
});

module.exports = {
  getCompletedAppointments,
};
