const jwt = require("jsonwebtoken");
const asyncHandler = require("express-async-handler");
const Doctor = require("../models/Doctor");
const Patient = require("../models/Patient");

// Doctor Protection Middleware
const protectDoctor = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      if (decoded.role !== "Doctor") {
        res.status(401);
        throw new Error("Not authorized as a doctor");
      }

      req.doctor = await Doctor.findById(decoded.id).select("-password");
      next();
    } catch (error) {
      console.error(error);
      res.status(401);
      throw new Error("Not authorized, token failed");
    }
  }

  if (!token) {
    res.status(401);
    throw new Error("Not authorized, no token");
  }
});

// Patient Protection Middleware
const protectPatient = asyncHandler(async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded.role !== "Patient") {
        res.status(401);
        throw new Error("Not authorized as a patient");
      }

      req.patient = await Patient.findById(decoded.id).select("-password");
      next();
    } catch (error) {
      console.error(error);
      res.status(401);
      throw new Error("Not authorized, token failed");
    }
  }

  if (!token) {
    res.status(401);
    throw new Error("Not authorized, no token");
  }
});

module.exports = { protectDoctor, protectPatient };
