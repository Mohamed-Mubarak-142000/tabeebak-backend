const asyncHandler = require("express-async-handler");
const { v4: uuidv4 } = require("uuid");

const specialties = [
  {
    value: "General_physician",
    label: { en: "General Physician", ar: "طبيب عام" },
  },
  { value: "Pediatrician", label: { en: "Pediatrician", ar: "طبيب أطفال" } },
  {
    value: "Gynecologist",
    label: { en: "Gynecologist", ar: "طبيب نساء وتوليد" },
  },
  {
    value: "Dermatologist",
    label: { en: "Dermatologist", ar: "طبيب جلدية" },
  },
  { value: "Cardiologist", label: { en: "Cardiologist", ar: "طبيب قلب" } },
  { value: "Neurologist", label: { en: "Neurologist", ar: "طبيب أعصاب" } },
  {
    value: "Orthopedic",
    label: { en: "Orthopedic Surgeon", ar: "جراح عظام" },
  },
  { value: "Psychiatrist", label: { en: "Psychiatrist", ar: "طبيب نفسي" } },
  {
    value: "Ophthalmologist",
    label: { en: "Ophthalmologist", ar: "طبيب عيون" },
  },
  {
    value: "ENT",
    label: { en: "ENT Specialist", ar: "طبيب أنف وأذن وحنجرة" },
  },
  { value: "Dentist", label: { en: "Dentist", ar: "طبيب أسنان" } },
  { value: "Urologist", label: { en: "Urologist", ar: "طبيب مسالك بولية" } },
  { value: "Oncologist", label: { en: "Oncologist", ar: "طبيب أورام" } },
  {
    value: "Endocrinologist",
    label: { en: "Endocrinologist", ar: "طبيب غدد صماء" },
  },
  { value: "Nephrologist", label: { en: "Nephrologist", ar: "طبيب كلى" } },
  {
    value: "Gastroenterologist",
    label: { en: "Gastroenterologist", ar: "طبيب جهاز هضمي" },
  },
  {
    value: "Pulmonologist",
    label: { en: "Pulmonologist", ar: "طبيب أمراض صدرية" },
  },
  {
    value: "Rheumatologist",
    label: { en: "Rheumatologist", ar: "طبيب روماتيزم" },
  },
  {
    value: "Hematologist",
    label: { en: "Hematologist", ar: "طبيب أمراض دم" },
  },
  { value: "Allergist", label: { en: "Allergist", ar: "طبيب حساسية" } },
  { value: "Surgeon", label: { en: "Surgeon", ar: "جراح" } },
  {
    value: "Plastic_surgeon",
    label: { en: "Plastic Surgeon", ar: "جراح تجميل" },
  },
  { value: "Radiologist", label: { en: "Radiologist", ar: "طبيب أشعة" } },
  { value: "Pathologist", label: { en: "Pathologist", ar: "طبيب أمراض" } },
  {
    value: "Anesthesiologist",
    label: { en: "Anesthesiologist", ar: "طبيب تخدير" },
  },
];

const specialtiesWithIds = specialties.map((specialty) => ({
  id: uuidv4(),
  ...specialty,
}));

const getSpecialties = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    data: specialtiesWithIds,
  });
});

module.exports = {
  getSpecialties,
  specialties,
};
