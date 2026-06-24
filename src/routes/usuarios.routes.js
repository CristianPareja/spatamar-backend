const express = require("express");
const router = express.Router();

const {
    listarUsuarios,
    registrarUsuario,
    loginUsuario,
    solicitarRecuperacionClave,
    restablecerClave
} = require("../controllers/usuarios.controller");

router.get("/", listarUsuarios);
router.post("/", registrarUsuario);
router.post("/login", loginUsuario);

router.post("/solicitar-recuperacion", solicitarRecuperacionClave);
router.post("/restablecer-clave", restablecerClave);

module.exports = router;