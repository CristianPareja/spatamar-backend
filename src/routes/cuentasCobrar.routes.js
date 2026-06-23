const express = require("express");
const router = express.Router();

const {
    listarCuentasCobrar,
    listarCuentasCobrarPorUsuario,
    registrarCuentaCobrar,
    marcarCuentaComoPagada
} = require("../controllers/cuentasCobrar.controller");

router.get("/", listarCuentasCobrar);
router.get("/usuario/:id_usuario", listarCuentasCobrarPorUsuario);
router.post("/", registrarCuentaCobrar);
router.patch("/:id/pagar", marcarCuentaComoPagada);

module.exports = router;