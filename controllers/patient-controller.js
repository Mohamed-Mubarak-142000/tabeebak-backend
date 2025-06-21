const asyncHandler = require("express-async-handler");
const Patient = require("../models/Patient.js");
const mongoose = require("mongoose");
const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");
const dotenv = require("dotenv");
dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
});

const updatePatient = asyncHandler(async (req, res) => {
  const patientId = req.patient._id;
  const updateData = req.body;
  const file = req.file;

  try {
    // Handle file upload if a file was provided
    if (file) {
      const currentPatient = await Patient.findById(patientId).select(
        "photoPublicId"
      );

      // Delete old photo from Cloudinary if it exists and isn't the default
      if (
        currentPatient?.photoPublicId &&
        currentPatient.photoPublicId !== "default"
      ) {
        await cloudinary.uploader.destroy(currentPatient.photoPublicId);
      }

      // Stream upload function
      const streamUpload = (buffer) =>
        new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            {
              folder: "patient-photos", // Changed folder name
              width: 500,
              height: 500,
              crop: "fill",
              format: "jpg",
            },
            (error, result) => {
              if (result) resolve(result);
              else reject(error);
            }
          );
          streamifier.createReadStream(buffer).pipe(stream);
        });

      // Upload the new photo
      const result = await streamUpload(file.buffer);

      // Update the photo data in the update object
      updateData.photo = result.secure_url;
      updateData.photoPublicId = result.public_id;
    }

    // Update the patient record
    const updatedPatient = await Patient.findByIdAndUpdate(
      patientId,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    ).select("-password");

    res.status(200).json({
      success: true,
      data: updatedPatient,
    });
  } catch (error) {
    console.error("Update patient error:", error.message, error.stack);
    res.status(500).json({
      success: false,
      message: "Failed to update patient profile",
    });
  }
});

const getBookedDoctors = asyncHandler(async (req, res) => {
  const patient = await Patient.findById(req.params.id).populate(
    "bookedDoctors"
  );

  if (!patient) {
    res.status(404);
    throw new Error("Patient not found");
  }

  // Make sure user is patient owner
  if (patient._id.toString() !== req.user._id.toString()) {
    res.status(401);
    throw new Error("Not authorized to view this patient");
  }

  res.status(200).json({
    success: true,
    count: patient.bookedDoctors.length,
    data: patient.bookedDoctors,
  });
});

const getPatient = asyncHandler(async (req, res) => {
  const patient = await Patient.findById(req.params.id);
  if (!patient) {
    res.status(404);
    throw new Error("Patient not found");
  }

  res.status(200).json({
    success: true,
    data: patient,
  });
});

module.exports = {
  updatePatient,
  getBookedDoctors,
  getPatient,
};
