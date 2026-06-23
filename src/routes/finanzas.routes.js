const express = require("express");
const router = express.Router();

const {
    obtenerResumenFinanciero,
    listarMovimientos
} = require("../controllers/finanzas.controller");

router.get("/resumen", obtenerResumenFinanciero);
router.get("/movimientos", listarMovimientos);

module.exports = router;