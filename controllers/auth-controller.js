const jwt = require("jsonwebtoken");
const asyncHandler = require("express-async-handler");
const Doctor = require("../models/Doctor.js");
const Patient = require("../models/Patient");
const { specialties } = require("./special-controller.js");
const { governorates } = require("./government-controller.js");
const { sendOTPEmail } = require("./email-service.js");
const { generateOTP } = require("../utils/generate-otp.js");
// Doctor Functions
const registerDoctor = asyncHandler(async (req, res) => {
  const {
    name,
    email,
    password,
    specialty,
    address,
    governorate,
    phone,
    age,
    bio,
    experience,
    location,
  } = req.body;

  const doctorExists = await Doctor.findOne({ email });
  if (doctorExists) {
    res.status(400);
    throw new Error("Doctor already exists");
  }

  const isValidSpecialty = specialties.some((spec) => spec.value === specialty);
  if (!isValidSpecialty) {
    res.status(400);
    throw new Error("Invalid specialty");
  }

  const isValidGovernorate = governorates.some(
    (gov) => gov.value === governorate
  );
  if (!isValidGovernorate) {
    res.status(400);
    throw new Error("Invalid governorate");
  }

  const doctor = await Doctor.create({
    name,
    email,
    password,
    specialty,
    address,
    governorate,
    phone,
    age,
    bio,
    location,
    experience,
  });

  if (doctor) {
    res.status(201).json({
      _id: doctor._id,
      name: doctor.name,
      email: doctor.email,
      specialty: doctor.specialty,
      governorate: doctor.governorate,
      role: "Doctor",
      token: generateDoctorToken(doctor._id),
    });
  } else {
    res.status(400);
    throw new Error("Invalid doctor data");
  }
});

const loginDoctor = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const doctor = await Doctor.findOne({ email }).select("+password");

  if (doctor && (await doctor.matchPassword(password))) {
    res.json({
      _id: doctor._id,
      name: doctor.name,
      email: doctor.email,
      role: "Doctor",
      specialty: doctor.specialty,
      token: generateDoctorToken(doctor._id),
    });
  } else {
    res.status(401);
    throw new Error("Invalid doctor credentials");
  }
});

const getDoctorProfile = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findById(req.doctor._id);

  if (!doctor) {
    res.status(404);
    throw new Error("Doctor not found");
  }

  let photo = null;

  if (doctor.photo) {
    if (doctor.photo.includes("res.cloudinary.com")) {
      photo = doctor.photo.replace(
        "/upload/",
        "/upload/w_500,h_500,c_fill,q_auto,f_auto/"
      );
    } else {
      photo = `${process.env.BASE_URL}/uploads/doctors/${doctor.photo}`;
    }
  }

  console.log("---------------------------------------------", doctor);

  res.json({
    _id: doctor._id,
    name: doctor.name,
    email: doctor.email,
    specialty: doctor.specialty,
    address: doctor.address,
    governorate: doctor.governorate,
    phone: doctor.phone,
    age: doctor.age,
    bio: doctor.bio,
    experience: doctor.experience,
    location: doctor.location,
    photo, // ← هذا ما تستخدمه في الفرونت
  });
});

// طلب تغيير كلمة المرور
const requestPasswordReset = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const doctor = await Doctor.findOne({ email });

  if (!doctor) {
    res.status(404);
    throw new Error("لا يوجد طبيب مسجل بهذا البريد الإلكتروني");
  }

  const otp = generateOTP();
  const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

  doctor.otp = otp;
  doctor.otpExpiry = otpExpiry;
  await doctor.save();

  await sendOTPEmail(email, otp);

  res.status(200).json({
    message: "تم إرسال رمز التحقق إلى بريدك الإلكتروني",
    email: email,
  });
});

const resetPasswordWithOTP = asyncHandler(async (req, res) => {
  const { email, otp, newPassword } = req.body;

  const doctor = await Doctor.findOne({
    email,
    otp,
    otpExpiry: { $gt: Date.now() },
  });

  if (!doctor) {
    res.status(400);
    throw new Error("رمز التحقق غير صالح أو منتهي الصلاحية");
  }

  doctor.password = newPassword;
  doctor.otp = undefined;
  doctor.otpExpiry = undefined;
  await doctor.save();

  res.status(200).json({
    message: "تم تغيير كلمة المرور بنجاح",
    email: email,
  });
});

// Patient Functions
const registerPatient = asyncHandler(async (req, res) => {
  const { name, email, password, phone, age, gender } = req.body;

  const patientExists = await Patient.findOne({ email });

  if (patientExists) {
    res.status(400);
    throw new Error("Patient already exists");
  }

  const patient = await Patient.create({
    name,
    email,
    password,
    phone,
    age,
    gender,
  });

  if (patient) {
    res.status(201).json({
      _id: patient._id,
      name: patient.name,
      email: patient.email,
      role: "Patient",
      token: generatePatientToken(patient._id),
    });
  } else {
    res.status(400);
    throw new Error("Invalid patient data");
  }
});

const loginPatient = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const patient = await Patient.findOne({ email }).select("+password");

  if (patient && (await patient.matchPassword(password))) {
    res.json({
      _id: patient._id,
      name: patient.name,
      email: patient.email,
      role: "Patient",
      token: generatePatientToken(patient._id),
    });
  } else {
    res.status(401);
    throw new Error("Invalid patient credentials");
  }
});

const getPatientProfile = asyncHandler(async (req, res) => {
  const patient = await Patient.findById(req.patient._id);

  if (!patient) {
    res.status(404);
    throw new Error("Patient not found");
  }

  let photo = null;

  if (patient.photo) {
    if (patient.photo.includes("res.cloudinary.com")) {
      photo = patient.photo.replace(
        "/upload/",
        "/upload/w_500,h_500,c_fill,q_auto,f_auto/"
      );
    } else {
      photo = `${process.env.BASE_URL}/uploads/patients/${patient.photo}`;
    }
  }

  if (patient) {
    res.json({
      _id: patient._id,
      name: patient.name,
      email: patient.email,
      phone: patient.phone,
      age: patient.age,
      gender: patient.gender,
      photo,
    });
  } else {
    res.status(404);
    throw new Error("Patient not found");
  }
});

// طلب تغيير كلمة المرور
const requestPasswordResetPatient = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const patient = await Patient.findOne({ email });

  if (!patient) {
    res.status(404);
    throw new Error("لا يوجد مريض مسجل بهذا البريد الإلكتروني");
  }

  const otp = generateOTP();
  const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

  patient.otp = otp;
  patient.otpExpiry = otpExpiry;
  await patient.save();

  await sendOTPEmail(email, otp);

  res.status(200).json({
    message: "تم إرسال رمز التحقق إلى بريدك الإلكتروني",
    email: email,
  });
});

const resetPasswordWithOTPPatient = asyncHandler(async (req, res) => {
  const { email, otp, newPassword } = req.body;

  const patient = await Patient.findOne({
    email,
    otp,
    otpExpiry: { $gt: Date.now() },
  });

  if (!patient) {
    res.status(400);
    throw new Error("رمز التحقق غير صالح أو منتهي الصلاحية");
  }

  patient.password = newPassword;
  patient.otp = undefined;
  patient.otpExpiry = undefined;
  await patient.save();

  res.status(200).json({
    message: "تم تغيير كلمة المرور بنجاح",
    email: email,
  });
});

// Token Generation
const generateDoctorToken = (id) => {
  return jwt.sign({ id, role: "Doctor" }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

const generatePatientToken = (id) => {
  return jwt.sign({ id, role: "Patient" }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

// Logout (common for both)
const logout = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
});

module.exports = {
  // Doctor exports
  registerDoctor,
  loginDoctor,
  getDoctorProfile,
  requestPasswordReset,
  resetPasswordWithOTP,

  requestPasswordResetPatient,
  resetPasswordWithOTPPatient,

  // Patient exports
  registerPatient,
  loginPatient,
  getPatientProfile,

  // Common exports
  logout,
};
