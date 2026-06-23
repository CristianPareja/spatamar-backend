const express = require("express");
const router = express.Router();

const {
    listarUsuarios,
    registrarUsuario,
    loginUsuario
} = require("../controllers/usuarios.controller");

router.get("/", listarUsuarios);
router.post("/", registrarUsuario);
router.post("/login", loginUsuario);

module.exports = router;