const express = require("express");
const router = express.Router();

const {
    listarCuentasCobrar,
    listarCuentasCobrarPorUsuario,
    marcarCuentaComoPagada
} = require("../controllers/cuentasCobrar.controller");

router.get("/", listarCuentasCobrar);
router.get("/usuario/:id_usuario", listarCuentasCobrarPorUsuario);
router.patch("/:id/pagar", marcarCuentaComoPagada);

module.exports = router;