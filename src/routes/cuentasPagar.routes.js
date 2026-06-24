const express = require("express");
const router = express.Router();

const {
    listarCuentasPagar,
    listarEgresosRecurrentes,
    registrarCuentaPagar,
    registrarEgresoRecurrente,
    actualizarCuentaPagar,
    cambiarEstadoEgresoRecurrente
} = require("../controllers/cuentasPagar.controller");

router.get("/", listarCuentasPagar);
router.get("/recurrentes", listarEgresosRecurrentes);

router.post("/", registrarCuentaPagar);
router.post("/recurrente", registrarEgresoRecurrente);

router.put("/:id", actualizarCuentaPagar);

router.patch("/recurrente/:id/estado", cambiarEstadoEgresoRecurrente);

module.exports = router;