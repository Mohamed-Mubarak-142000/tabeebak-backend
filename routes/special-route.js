const express = require("express");
const router = express.Router();
const { getSpecialties } = require("../controllers/special-controller");

router.get("/", getSpecialties);

module.exports = router;
