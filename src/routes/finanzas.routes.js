const express = require("express");
const router = express.Router();

const {
    obtenerResumenFinanciero,
    obtenerResumenFinancieroMensual,
    listarMovimientos
} = require("../controllers/finanzas.controller");

router.get("/resumen", obtenerResumenFinanciero);
router.get("/resumen-mensual", obtenerResumenFinancieroMensual);
router.get("/movimientos", listarMovimientos);

module.exports = router;