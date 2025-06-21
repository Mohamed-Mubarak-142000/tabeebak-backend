// controllers/review-controller.js
const asyncHandler = require("express-async-handler");
const Doctor = require("../models/Doctor");
const Review = require("../models/Review");

const addReview = asyncHandler(async (req, res) => {
  const { rating, comment } = req.body;
  const doctorId = req.params.id;
  const patientId = req.patient._id;

  if (!rating || !comment) {
    res.status(400);
    throw new Error("Please provide both rating and comment");
  }

  const doctor = await Doctor.findById(doctorId);
  if (!doctor) {
    res.status(404);
    throw new Error("Doctor not found");
  }

  // Check if patient already reviewed this doctor
  const alreadyReviewed = await Review.findOne({
    doctor: doctorId,
    patient: patientId,
  });

  if (alreadyReviewed) {
    res.status(400);
    throw new Error("You have already reviewed this doctor");
  }

  const review = await Review.create({
    doctor: doctorId,
    patient: patientId,
    rating: Number(rating),
    comment,
  });

  // Update doctor's average rating
  const stats = await Review.aggregate([
    {
      $match: { doctor: doctor._id },
    },
    {
      $group: {
        _id: "$doctor",
        averageRating: { $avg: "$rating" },
        count: { $sum: 1 },
      },
    },
  ]);

  if (stats.length > 0) {
    doctor.averageRating = parseFloat(stats[0].averageRating.toFixed(1));
    await doctor.save();
  }

  res.status(201).json({
    success: true,
    data: review,
  });
});

const getReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find({ doctor: req.params.id })
    .populate("patient", "name photo")
    .sort("-createdAt");

  const doctor = await Doctor.findById(req.params.id);

  if (!doctor) {
    res.status(404);
    throw new Error("Doctor not found");
  }

  res.status(200).json({
    success: true,
    count: reviews.length,
    averageRating: doctor.averageRating,
    data: reviews,
  });
});

const deleteReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);

  if (!review) {
    res.status(404);
    throw new Error("Review not found");
  }

  // Check if the patient is the owner of the review or if it's an admin
  if (
    review.patient.toString() !== req.patient._id.toString() &&
    req.user.role !== "admin"
  ) {
    res.status(401);
    throw new Error("Not authorized to delete this review");
  }

  await Review.deleteOne({ _id: req.params.id });

  // Update doctor's average rating
  const doctor = await Doctor.findById(review.doctor);
  const stats = await Review.aggregate([
    {
      $match: { doctor: doctor._id },
    },
    {
      $group: {
        _id: "$doctor",
        averageRating: { $avg: "$rating" },
        count: { $sum: 1 },
      },
    },
  ]);

  if (stats.length > 0) {
    doctor.averageRating = parseFloat(stats[0].averageRating.toFixed(1));
  } else {
    doctor.averageRating = 0;
  }
  await doctor.save();

  res.status(200).json({
    success: true,
    message: "Review deleted successfully",
  });
});

module.exports = {
  addReview,
  getReviews,
  deleteReview,
};
