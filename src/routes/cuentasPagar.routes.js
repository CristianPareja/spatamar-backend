const express = require("express");
const router = express.Router();

const {
    listarCuentasPagar,
    listarEgresosRecurrentes,
    registrarCuentaPagar,
    registrarEgresoRecurrente,
    actualizarCuentaPagar,
    cambiarEstadoEgresoRecurrente,
    eliminarCuentaPagar
} = require("../controllers/cuentasPagar.controller");

router.get("/", listarCuentasPagar);
router.get("/recurrentes", listarEgresosRecurrentes);

router.post("/", registrarCuentaPagar);
router.post("/recurrente", registrarEgresoRecurrente);

router.put("/:id", actualizarCuentaPagar);

router.delete("/:id", eliminarCuentaPagar);

router.patch("/recurrente/:id/estado", cambiarEstadoEgresoRecurrente);

module.exports = router;