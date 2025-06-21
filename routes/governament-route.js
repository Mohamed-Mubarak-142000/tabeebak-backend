const express = require("express");
const { getGovernorates } = require("../controllers/government-controller");

const router = express.Router();

router.get("/", getGovernorates);

module.exports = router;
