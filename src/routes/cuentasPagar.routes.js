const express = require("express");
const router = express.Router();

const {
    listarCuentasPagar,
    registrarCuentaPagar
} = require("../controllers/cuentasPagar.controller");

router.get("/", listarCuentasPagar);
router.post("/", registrarCuentaPagar);

module.exports = router;