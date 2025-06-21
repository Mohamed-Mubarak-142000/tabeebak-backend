const asyncHandler = require("express-async-handler");
const { v4: uuidv4 } = require("uuid");

const governorates = [
  { value: "cairo", label: { en: "Cairo", ar: "القاهرة" } },
  { value: "giza", label: { en: "Giza", ar: "الجيزة" } },
  { value: "alexandria", label: { en: "Alexandria", ar: "الإسكندرية" } },
  { value: "dakahlia", label: { en: "Dakahlia", ar: "الدقهلية" } },
  { value: "sharqia", label: { en: "Sharqia", ar: "الشرقية" } },
  { value: "gharbia", label: { en: "Gharbia", ar: "الغربية" } },
  { value: "monufia", label: { en: "Monufia", ar: "المنوفية" } },
  { value: "qalyubia", label: { en: "Qalyubia", ar: "القليوبية" } },
  { value: "beheira", label: { en: "Beheira", ar: "البحيرة" } },
  { value: "kafr_el_sheikh", label: { en: "Kafr El-Sheikh", ar: "كفر الشيخ" } },
  { value: "fayoum", label: { en: "Fayoum", ar: "الفيوم" } },
  { value: "bani_suef", label: { en: "Bani Suef", ar: "بني سويف" } },
  { value: "minya", label: { en: "Minya", ar: "المنيا" } },
  { value: "assiut", label: { en: "Assiut", ar: "أسيوط" } },
  { value: "sohag", label: { en: "Sohag", ar: "سوهاج" } },
  { value: "qena", label: { en: "Qena", ar: "قنا" } },
  { value: "luxor", label: { en: "Luxor", ar: "الأقصر" } },
  { value: "aswan", label: { en: "Aswan", ar: "أسوان" } },
  { value: "red_sea", label: { en: "Red Sea", ar: "البحر الأحمر" } },
  { value: "new_valley", label: { en: "New Valley", ar: "الوادي الجديد" } },
  { value: "matrouh", label: { en: "Matrouh", ar: "مطروح" } },
  { value: "north_sinai", label: { en: "North Sinai", ar: "شمال سيناء" } },
  { value: "south_sinai", label: { en: "South Sinai", ar: "جنوب سيناء" } },
  { value: "ismailia", label: { en: "Ismailia", ar: "الإسماعيلية" } },
  { value: "suez", label: { en: "Suez", ar: "السويس" } },
  { value: "port_said", label: { en: "Port Said", ar: "بورسعيد" } },
  { value: "damietta", label: { en: "Damietta", ar: "دمياط" } },
];

const governoratesWithIds = governorates.map((governament) => ({
  id: uuidv4(),
  ...governament,
}));

const getGovernorates = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    data: governoratesWithIds,
  });
});

module.exports = {
  getGovernorates,
  governorates,
};
