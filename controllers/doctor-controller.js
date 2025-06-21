const asyncHandler = require("express-async-handler");
const Appointment = require("../models/Appointment");
const Doctor = require("../models/Doctor");
const Review = require("../models/Review");
const ArchivePatient = require("../models/Archive-patient");
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

const getDoctors = asyncHandler(async (req, res) => {
  let query;
  const reqQuery = { ...req.query };
  const removeFields = ["select", "sort", "page", "limit"];
  removeFields.forEach((param) => delete reqQuery[param]);
  let queryStr = JSON.stringify(reqQuery);
  queryStr = queryStr.replace(
    /\b(gt|gte|lt|lte|in)\b/g,
    (match) => `$${match}`
  );
  query = Doctor.find(JSON.parse(queryStr));
  if (req.query.select) {
    const fields = req.query.select.split(",").join(" ");
    query = query.select(fields);
  }
  if (req.query.sort) {
    const sortBy = req.query.sort.split(",").join(" ");
    query = query.sort(sortBy);
  } else {
    query = query.sort("-createdAt");
  }

  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 25;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const total = await Doctor.countDocuments();

  query = query.skip(startIndex).limit(limit);

  // Executing query
  const doctors = await query;

  // Pagination result
  const pagination = {};

  if (endIndex < total) {
    pagination.next = {
      page: page + 1,
      limit,
    };
  }

  if (startIndex > 0) {
    pagination.prev = {
      page: page - 1,
      limit,
    };
  }

  res.status(200).json({
    success: true,
    count: doctors.length,
    pagination,
    data: doctors,
  });
});

const getDoctor = asyncHandler(async (req, res) => {
  let doctor = await Doctor.findById(req.params.id);

  if (!doctor) {
    res.status(404);
    throw new Error("Doctor not found");
  }

  console.log("---------------------------------------------", doctor);

  res.status(200).json({
    success: true,
    data: doctor,
  });
});

const updateDoctor = asyncHandler(async (req, res) => {
  const doctorId = req.params.id;
  const updateData = req.body;
  const file = req.file;

  try {
    if (file) {
      const currentDoctor = await Doctor.findById(doctorId).select(
        "photoPublicId"
      );

      if (
        currentDoctor?.photoPublicId &&
        currentDoctor.photoPublicId !== "default"
      ) {
        await cloudinary.uploader.destroy(currentDoctor.photoPublicId);
      }

      const streamUpload = (buffer) =>
        new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            {
              folder: "doctor-photos",
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

      const result = await streamUpload(file.buffer);

      updateData.photo = result.secure_url;
      updateData.photoPublicId = result.public_id;
    }
    console.log("Uploaded file:", req.file);

    const updatedDoctor = await Doctor.findByIdAndUpdate(doctorId, updateData, {
      new: true,
      runValidators: true,
    }).select("-password");

    res.status(200).json({
      success: true,
      data: updatedDoctor,
    });
  } catch (error) {
    console.error("Update error:", error.message, error.stack);
    res.status(500).json({
      success: false,
      message: "Failed to update doctor profile",
    });
  }
});

const getDoctorsBySpecialtyAndGovernorate = asyncHandler(async (req, res) => {
  // Clone the query object to avoid modifying the original
  const queryParams = { ...req.query };

  // Remove pagination and fields that shouldn't be in the query
  const { page = 1, limit = 10, ...filters } = queryParams;

  console.log("Filter params:", filters);

  // Validate page and limit
  const pageNumber = parseInt(page, 10) || 1;
  const limitNumber = parseInt(limit, 10) || 10;
  const skip = (pageNumber - 1) * limitNumber;

  // Build query carefully - only include allowed fields
  let query = {};

  if (filters.specialty) query.specialty = filters.specialty;
  if (filters.governorate) query.governorate = filters.governorate;
  if (filters.name) query.name = { $regex: filters.name, $options: "i" };

  try {
    const [doctors, total] = await Promise.all([
      Doctor.find(query)
        .skip(skip)
        .limit(limitNumber)
        .sort({ rating: -1 })
        .lean(),
      Doctor.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      count: doctors.length,
      total,
      page: pageNumber,
      pages: Math.ceil(total / limitNumber),
      data: doctors,
    });
  } catch (error) {
    console.error("Error in getDoctorsBySpecialtyAndGovernorate:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

const getDashboardStats = asyncHandler(async (req, res) => {
  const doctorId = req.doctor._id;

  // حساب تواريخ الشهر الحالي والسابق
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  // استعلامات للمواعيد النشطة
  const activeAppointmentsQuery = { doctor: doctorId };
  const activeCurrentMonthQuery = {
    doctor: doctorId,
    createdAt: { $gte: currentMonthStart },
  };
  const activePreviousMonthQuery = {
    doctor: doctorId,
    createdAt: { $gte: previousMonthStart, $lte: previousMonthEnd },
  };

  // استعلامات للمواعيد المؤرشفة
  const archivedAppointmentsQuery = { doctor: doctorId };
  const archivedCurrentMonthQuery = {
    doctor: doctorId,
    completedAt: { $gte: currentMonthStart },
  };
  const archivedPreviousMonthQuery = {
    doctor: doctorId,
    completedAt: { $gte: previousMonthStart, $lte: previousMonthEnd },
  };

  // إجمالي عدد المواعيد (نشطة + مؤرشفة)
  const [totalActive, totalArchived] = await Promise.all([
    Appointment.countDocuments(activeAppointmentsQuery),
    ArchivePatient.countDocuments(archivedAppointmentsQuery),
  ]);
  const totalAppointments = totalActive + totalArchived;

  // عدد مواعيد الشهر الحالي (نشطة + مؤرشفة)
  const [currentMonthActive, currentMonthArchived] = await Promise.all([
    Appointment.countDocuments(activeCurrentMonthQuery),
    ArchivePatient.countDocuments(archivedCurrentMonthQuery),
  ]);
  const currentMonthAppointments = currentMonthActive + currentMonthArchived;

  // عدد مواعيد الشهر السابق (نشطة + مؤرشفة)
  const [previousMonthActive, previousMonthArchived] = await Promise.all([
    Appointment.countDocuments(activePreviousMonthQuery),
    ArchivePatient.countDocuments(archivedPreviousMonthQuery),
  ]);
  const previousMonthAppointments = previousMonthActive + previousMonthArchived;

  const appointmentsChange =
    previousMonthAppointments > 0
      ? Math.round(
          ((currentMonthAppointments - previousMonthAppointments) /
            previousMonthAppointments) *
            100
        )
      : 100;

  // عدد المرضى الفريدين الكلي (نشطة + مؤرشفة)
  const [activePatients, archivedPatients] = await Promise.all([
    Appointment.distinct("patient", activeAppointmentsQuery),
    ArchivePatient.distinct("patient", archivedAppointmentsQuery),
  ]);
  const totalPatients = [...new Set([...activePatients, ...archivedPatients])];

  // عدد المرضى الفريدين في الشهر الحالي (نشطة + مؤرشفة)
  const [currentMonthActivePatients, currentMonthArchivedPatients] =
    await Promise.all([
      Appointment.distinct("patient", activeCurrentMonthQuery),
      ArchivePatient.distinct("patient", archivedCurrentMonthQuery),
    ]);
  const currentMonthPatients = [
    ...new Set([
      ...currentMonthActivePatients,
      ...currentMonthArchivedPatients,
    ]),
  ];

  // عدد المرضى الفريدين في الشهر السابق (نشطة + مؤرشفة)
  const [previousMonthActivePatients, previousMonthArchivedPatients] =
    await Promise.all([
      Appointment.distinct("patient", activePreviousMonthQuery),
      ArchivePatient.distinct("patient", archivedPreviousMonthQuery),
    ]);
  const previousMonthPatients = [
    ...new Set([
      ...previousMonthActivePatients,
      ...previousMonthArchivedPatients,
    ]),
  ];

  const patientsChange =
    previousMonthPatients.length > 0
      ? Math.round(
          ((currentMonthPatients.length - previousMonthPatients.length) /
            previousMonthPatients.length) *
            100
        )
      : 100;

  // إحصائيات الإيرادات (من المواعيد المكتملة فقط - نشطة + مؤرشفة)
  const [activeRevenueStats, archivedRevenueStats] = await Promise.all([
    Appointment.aggregate([
      {
        $match: {
          doctor: new mongoose.Types.ObjectId(doctorId),
          status: "completed",
          createdAt: { $gte: currentMonthStart },
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$price" },
        },
      },
    ]),
    ArchivePatient.aggregate([
      {
        $match: {
          doctor: new mongoose.Types.ObjectId(doctorId),
          completedAt: { $gte: currentMonthStart },
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$price" },
        },
      },
    ]),
  ]);

  const totalRevenue =
    (activeRevenueStats[0]?.totalRevenue || 0) +
    (archivedRevenueStats[0]?.totalRevenue || 0);

  // إحصائيات الإيرادات للشهر السابق
  const [prevActiveRevenueStats, prevArchivedRevenueStats] = await Promise.all([
    Appointment.aggregate([
      {
        $match: {
          doctor: new mongoose.Types.ObjectId(doctorId),
          status: "completed",
          createdAt: { $gte: previousMonthStart, $lte: previousMonthEnd },
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$price" },
        },
      },
    ]),
    ArchivePatient.aggregate([
      {
        $match: {
          doctor: new mongoose.Types.ObjectId(doctorId),
          completedAt: { $gte: previousMonthStart, $lte: previousMonthEnd },
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$price" },
        },
      },
    ]),
  ]);

  const previousRevenue =
    (prevActiveRevenueStats[0]?.totalRevenue || 0) +
    (prevArchivedRevenueStats[0]?.totalRevenue || 0);

  const revenueChange =
    previousRevenue > 0
      ? Math.round(((totalRevenue - previousRevenue) / previousRevenue) * 100)
      : 100;

  // التقييم المتوسط (من المراجعات النشطة فقط - عادة المراجعات لا تؤرشف)
  const ratingStats = await Review.aggregate([
    {
      $match: {
        doctor: new mongoose.Types.ObjectId(doctorId),
      },
    },
    {
      $group: {
        _id: null,
        averageRating: { $avg: "$rating" },
        count: { $sum: 1 },
      },
    },
  ]);

  const previousRatingStats = await Review.aggregate([
    {
      $match: {
        doctor: new mongoose.Types.ObjectId(doctorId),
        createdAt: { $gte: previousMonthStart, $lte: previousMonthEnd },
      },
    },
    {
      $group: {
        _id: null,
        averageRating: { $avg: "$rating" },
      },
    },
  ]);

  const averageRating = ratingStats[0]?.averageRating || 0;
  const previousRating = previousRatingStats[0]?.averageRating || 0;

  const ratingChange =
    previousRating > 0
      ? Math.round(((averageRating - previousRating) / previousRating) * 100)
      : 0;

  // عدد الـ availableSlots المتاحة حاليًا
  const doctor = await Doctor.findById(doctorId).lean();
  const availableSlotsCount =
    doctor?.availableSlots?.filter((slot) => slot.isAvailable).length || 0;

  res.status(200).json({
    success: true,
    data: {
      totalAppointments,
      appointmentsChange,
      totalPatients: totalPatients.length,
      patientsChange,
      totalRevenue,
      revenueChange,
      averageRating: parseFloat(averageRating.toFixed(1)),
      ratingChange,
      availableSlotsCount,
      includeArchived: true,
    },
  });
});

const getAppointmentStats = asyncHandler(async (req, res) => {
  const doctorId = req.doctor._id;
  const now = new Date();

  // Weekly stats - last 7 days (بما في ذلك المحذوفة)
  const weeklyLabels = [];
  const weeklyScheduled = [];
  const weeklyCompleted = [];
  const weeklyCancelled = [];

  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
    weeklyLabels.push(dayName);

    const startOfDay = new Date(date.setHours(0, 0, 0, 0));
    const endOfDay = new Date(date.setHours(23, 59, 59, 999));

    // استعلامات للمواعيد النشطة
    const [activeScheduled, activeCompleted, activeCancelled] =
      await Promise.all([
        Appointment.countDocuments({
          doctor: doctorId,
          createdAt: { $gte: startOfDay, $lte: endOfDay },
        }),
        Appointment.countDocuments({
          doctor: doctorId,
          status: "completed",
          createdAt: { $gte: startOfDay, $lte: endOfDay },
        }),
        Appointment.countDocuments({
          doctor: doctorId,
          status: "cancelled",
          createdAt: { $gte: startOfDay, $lte: endOfDay },
        }),
        Appointment.countDocuments({
          doctor: doctorId,
          status: "confirmed",
          createdAt: { $gte: startOfDay, $lte: endOfDay },
        }),
      ]);

    // استعلامات للمواعيد المؤرشفة
    const [archivedScheduled, archivedCompleted] = await Promise.all([
      ArchivePatient.countDocuments({
        doctor: doctorId,
        completedAt: { $gte: startOfDay, $lte: endOfDay },
      }),
      ArchivePatient.countDocuments({
        doctor: doctorId,
        completedAt: { $gte: startOfDay, $lte: endOfDay },
      }),
    ]);

    weeklyScheduled.push(activeScheduled + archivedScheduled);
    weeklyCompleted.push(activeCompleted + archivedCompleted);
    weeklyCancelled.push(activeCancelled); // عادة لا يتم أرشفة المواعيد الملغاة
  }

  // Monthly stats - current year (بما في ذلك المحذوفة)
  const monthlyLabels = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const monthlyScheduled = [];
  const monthlyCompleted = [];
  const monthlyCancelled = [];

  for (let i = 0; i < 12; i++) {
    const startOfMonth = new Date(now.getFullYear(), i, 1);
    const endOfMonth = new Date(now.getFullYear(), i + 1, 0);

    // استعلامات للمواعيد النشطة
    const [activeScheduled, activeCompleted, activeCancelled] =
      await Promise.all([
        Appointment.countDocuments({
          doctor: doctorId,
          createdAt: { $gte: startOfMonth, $lte: endOfMonth },
        }),
        Appointment.countDocuments({
          doctor: doctorId,
          status: "completed",
          createdAt: { $gte: startOfMonth, $lte: endOfMonth },
        }),
        Appointment.countDocuments({
          doctor: doctorId,
          status: "cancelled",
          createdAt: { $gte: startOfMonth, $lte: endOfMonth },
        }),
      ]);

    // استعلامات للمواعيد المؤرشفة
    const [archivedScheduled, archivedCompleted] = await Promise.all([
      ArchivePatient.countDocuments({
        doctor: doctorId,
        completedAt: { $gte: startOfMonth, $lte: endOfMonth },
      }),
      ArchivePatient.countDocuments({
        doctor: doctorId,
        completedAt: { $gte: startOfMonth, $lte: endOfMonth },
      }),
    ]);

    monthlyScheduled.push(activeScheduled + archivedScheduled);
    monthlyCompleted.push(activeCompleted + archivedCompleted);
    monthlyCancelled.push(activeCancelled); // عادة لا يتم أرشفة المواعيد الملغاة
  }

  res.status(200).json({
    success: true,
    data: {
      weekly: {
        labels: weeklyLabels,
        scheduled: weeklyScheduled,
        completed: weeklyCompleted,
        cancelled: weeklyCancelled,
        includeArchived: true,
      },
      monthly: {
        labels: monthlyLabels.slice(0, now.getMonth() + 1),
        scheduled: monthlyScheduled.slice(0, now.getMonth() + 1),
        completed: monthlyCompleted.slice(0, now.getMonth() + 1),
        cancelled: monthlyCancelled.slice(0, now.getMonth() + 1),
        includeArchived: true,
      },
    },
  });
});

const getPatientStats = asyncHandler(async (req, res) => {
  const doctorId = req.doctor._id;
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const labels = [];
  const newPatients = { archive: [], notArchive: [] };
  const returningPatients = { archive: [], notArchive: [] };

  for (let i = 5; i >= 0; i--) {
    const month = new Date();
    month.setMonth(month.getMonth() - i);
    labels.push(months[month.getMonth()]);

    const startOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
    const endOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0);

    // المرضى الجدد من الأرشيف
    const newArchive = await ArchivePatient.aggregate([
      {
        $match: {
          doctor: doctorId,
          completedAt: { $gte: startOfMonth, $lte: endOfMonth },
        },
      },
      {
        $group: {
          _id: "$patient",
          firstAppointment: { $min: "$completedAt" },
        },
      },
      {
        $match: {
          firstAppointment: { $gte: startOfMonth, $lte: endOfMonth },
        },
      },
    ]);

    // المرضى الجدد من غير الأرشيف
    const newNotArchive = await Appointment.aggregate([
      {
        $match: {
          doctor: doctorId,
          createdAt: { $gte: startOfMonth, $lte: endOfMonth },
        },
      },
      {
        $group: {
          _id: "$patient",
          firstAppointment: { $min: "$createdAt" },
        },
      },
      {
        $match: {
          firstAppointment: { $gte: startOfMonth, $lte: endOfMonth },
        },
      },
    ]);

    // المرضى العائدين من الأرشيف
    const returningArchive = await ArchivePatient.aggregate([
      {
        $match: {
          doctor: doctorId,
          completedAt: { $gte: startOfMonth, $lte: endOfMonth },
        },
      },
      {
        $group: {
          _id: "$patient",
          firstAppointment: { $min: "$completedAt" },
        },
      },
      {
        $match: {
          firstAppointment: { $lt: startOfMonth },
        },
      },
    ]);

    // المرضى العائدين من غير الأرشيف
    const returningNotArchive = await Appointment.aggregate([
      {
        $match: {
          doctor: doctorId,
          createdAt: { $gte: startOfMonth, $lte: endOfMonth },
        },
      },
      {
        $group: {
          _id: "$patient",
          firstAppointment: { $min: "$createdAt" },
        },
      },
      {
        $match: {
          firstAppointment: { $lt: startOfMonth },
        },
      },
    ]);

    // إضافة الأعداد للمصفوفات
    newPatients.archive.push(newArchive.length);
    newPatients.notArchive.push(newNotArchive.length);
    returningPatients.archive.push(returningArchive.length);
    returningPatients.notArchive.push(returningNotArchive.length);
  }

  res.status(200).json({
    success: true,
    labels,
    newPatients,
    returningPatients,
  });
});

const getRevenueStats = asyncHandler(async (req, res) => {
  const doctorId = req.doctor._id;

  // حساب تواريخ الـ 12 شهراً الماضية
  const now = new Date();
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  // استعلام للإيرادات من المواعيد النشطة المكتملة
  const activeRevenue = await Appointment.aggregate([
    {
      $match: {
        doctor: new mongoose.Types.ObjectId(doctorId),
        status: "completed",
        createdAt: { $gte: twelveMonthsAgo },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
        },
        total: { $sum: "$price" },
      },
    },
    {
      $sort: {
        "_id.year": 1,
        "_id.month": 1,
      },
    },
  ]);

  // استعلام للإيرادات من المواعيد المؤرشفة
  const archivedRevenue = await ArchivePatient.aggregate([
    {
      $match: {
        doctor: new mongoose.Types.ObjectId(doctorId),
        completedAt: { $gte: twelveMonthsAgo },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: "$completedAt" },
          month: { $month: "$completedAt" },
        },
        total: { $sum: "$price" },
      },
    },
    {
      $sort: {
        "_id.year": 1,
        "_id.month": 1,
      },
    },
  ]);

  // دمج النتائج من المواعيد النشطة والمؤرشفة
  const combinedRevenue = [...activeRevenue, ...archivedRevenue].reduce(
    (acc, curr) => {
      const key = `${curr._id.year}-${curr._id.month}`;
      if (!acc[key]) {
        acc[key] = { ...curr._id, total: 0 };
      }
      acc[key].total += curr.total;
      return acc;
    },
    {}
  );

  // تحويل النتائج المدمجة إلى مصفوفة وترتيبها
  const revenueByMonth = Object.values(combinedRevenue).sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.month - b.month;
  });

  // إنشاء تسميات الشهور (مثل "Jan 2023")
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const labels = revenueByMonth.map(
    (item) => `${monthNames[item.month - 1]} ${item.year}`
  );
  const data = revenueByMonth.map((item) => item.total);

  res.status(200).json({
    success: true,
    labels,
    data,
  });
});

const getRatingStats = asyncHandler(async (req, res) => {
  const doctorId = req.doctor._id;
  const now = new Date();
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const labels = [];
  const ratings = [];

  for (let i = 5; i >= 0; i--) {
    const month = new Date();
    month.setMonth(month.getMonth() - i);
    labels.push(months[month.getMonth()]);

    const startOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
    const endOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0);

    // ✅ هنا نجيب المراجعات من الـ Review collection
    const monthlyReviews = await Review.find({
      doctor: doctorId,
      createdAt: { $gte: startOfMonth, $lte: endOfMonth },
    });

    console.log(
      `Month: ${months[month.getMonth()]}, Reviews Count: ${
        monthlyReviews.length
      }`
    );

    if (monthlyReviews.length > 0) {
      const sum = monthlyReviews.reduce(
        (acc, review) => acc + review.rating,
        0
      );
      ratings.push(parseFloat((sum / monthlyReviews.length).toFixed(1)));
    } else {
      ratings.push(0);
    }
  }

  res.status(200).json({
    success: true,
    labels,
    ratings,
  });
});

const getAvailableSlotsStats = asyncHandler(async (req, res) => {
  const doctorId = req.doctor._id;

  const doctor = await Doctor.findById(doctorId).lean();

  const availableSlots = doctor?.availableSlots || [];

  const availableCount = availableSlots.filter(
    (slot) => slot.isAvailable
  ).length;
  const unavailableCount = availableSlots.filter(
    (slot) => !slot.isAvailable
  ).length;

  res.status(200).json({
    success: true,
    data: {
      available: availableCount,
      unavailable: unavailableCount,
    },
  });
});

/*********** */

const getAvailableSlots = asyncHandler(async (req, res) => {
  const { doctorId } = req.params;
  const { showAll = "false" } = req.query; // Default: false (يظهر فقط المتاحة)

  const doctor = await Doctor.findById(doctorId)
    .select("availableSlots name specialty")
    .lean();

  if (!doctor) {
    return res
      .status(404)
      .json({ success: false, message: "الطبيب غير موجود" });
  }

  // فلترة السلات بناءً على القيمة المرسلة من الفرونت
  const slots =
    showAll === "true"
      ? doctor.availableSlots // إظهار الكل
      : doctor.availableSlots.filter((slot) => slot.isAvailable); // إظهار المتاحة فقط

  res.status(200).json({
    success: true,
    data: {
      doctor: {
        name: doctor.name,
        specialty: doctor.specialty,
      },
      slots, // نرسل السلات بعد الفلترة
    },
  });
});

const addAvailableSlot = asyncHandler(async (req, res) => {
  const doctorId = req.doctor._id;
  const { day, startTime, endTime, slotDuration, type } = req.body;

  // التحقق من صحة البيانات
  if (!day || !startTime || !endTime || !type) {
    return res.status(400).json({
      success: false,
      message: "الرجاء إدخال جميع الحقول المطلوبة",
    });
  }

  // التحقق من أن وقت البداية قبل وقت النهاية
  if (
    new Date(`1970-01-01T${startTime}`) >= new Date(`1970-01-01T${endTime}`)
  ) {
    return res.status(400).json({
      success: false,
      message: "وقت البداية يجب أن يكون قبل وقت النهاية",
    });
  }

  // التحقق من صحة نوع الموعد
  const validTypes = ["consultation", "procedure", "test", "medication"];
  if (!validTypes.includes(type)) {
    return res.status(400).json({
      success: false,
      message: "نوع الموعد غير صالح",
    });
  }

  try {
    const doctor = await Doctor.findByIdAndUpdate(
      doctorId,
      {
        $push: {
          availableSlots: {
            day: day.toLowerCase(),
            startTime,
            endTime,
            slotDuration: slotDuration || 30,
            isAvailable: true,
            type: type,
          },
        },
      },
      { new: true, runValidators: true }
    ).select("availableSlots");

    res.status(201).json({
      success: true,
      data: doctor.availableSlots,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء إضافة الموعد",
      error: error.message,
    });
  }
});

const updateAvailableSlot = asyncHandler(async (req, res) => {
  const doctorId = req.doctor._id;
  const slotId = req.params.slotId;
  const updateData = req.body;

  try {
    // التحقق من أن الموعد موجود
    const doctor = await Doctor.findOne({
      _id: doctorId,
      "availableSlots._id": slotId,
    });

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "الموعد غير موجود",
      });
    }

    // تحديث البيانات
    const updatedDoctor = await Doctor.findOneAndUpdate(
      {
        _id: doctorId,
        "availableSlots._id": slotId,
      },
      {
        $set: {
          "availableSlots.$.day": updateData.day.toLowerCase(),
          "availableSlots.$.startTime": updateData.startTime,
          "availableSlots.$.endTime": updateData.endTime,
          "availableSlots.$.slotDuration": updateData.slotDuration || 30,
        },
      },
      { new: true, runValidators: true }
    ).select("availableSlots");

    res.status(200).json({
      success: true,
      data: updatedDoctor.availableSlots,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء تحديث الموعد",
      error: error.message,
    });
  }
});

const deleteAvailableSlot = asyncHandler(async (req, res) => {
  const doctorId = req.doctor._id;
  const slotId = req.params.slotId;

  try {
    const doctor = await Doctor.findByIdAndUpdate(
      doctorId,
      {
        $pull: {
          availableSlots: { _id: slotId },
        },
      },
      { new: true }
    ).select("availableSlots");

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "الطبيب غير موجود",
      });
    }

    res.status(200).json({
      success: true,
      data: doctor.availableSlots,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء حذف الموعد",
      error: error.message,
    });
  }
});

const toggleSlotAvailability = asyncHandler(async (req, res) => {
  const doctorId = req.doctor._id;
  const slotId = req.params.slotId;

  try {
    // البحث عن الطبيب والتحقق من وجود الموعد
    const doctor = await Doctor.findOne({
      _id: doctorId,
      "availableSlots._id": slotId,
    });

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "الموعد غير موجود",
      });
    }

    // العثور على الـ slot المحدد
    const slot = doctor.availableSlots.find((s) => s._id.toString() === slotId);

    // تحديث حالة isAvailable
    const updatedDoctor = await Doctor.findOneAndUpdate(
      {
        _id: doctorId,
        "availableSlots._id": slotId,
      },
      {
        $set: {
          "availableSlots.$.isAvailable": !slot.isAvailable,
        },
      },
      { new: true, runValidators: true }
    ).select("availableSlots");

    res.status(200).json({
      success: true,
      data: updatedDoctor.availableSlots,
      message: `تم ${slot.isAvailable ? "تعطيل" : "تفعيل"} الموعد بنجاح`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء تحديث حالة الموعد",
      error: error.message,
    });
  }
});

module.exports = {
  getDashboardStats,
  getAppointmentStats,
  getPatientStats,
  getRevenueStats,
  getRatingStats,
  getAvailableSlotsStats,

  getDoctors,
  getDoctor,
  updateDoctor,
  getDoctorsBySpecialtyAndGovernorate,

  getAvailableSlots,
  addAvailableSlot,
  updateAvailableSlot,
  deleteAvailableSlot,
  toggleSlotAvailability,
};
