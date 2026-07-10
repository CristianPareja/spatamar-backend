const express = require("express");
const router = express.Router();

const {
    registrarUsuario,
    loginUsuario,
    listarUsuarios,
    obtenerUsuarioPorId,
    actualizarUsuario,
    solicitarRecuperacion,
    restablecerClave
} = require("../controllers/usuarios.controller");

router.post("/", registrarUsuario);
router.post("/login", loginUsuario);

router.get("/", listarUsuarios);
router.get("/:id", obtenerUsuarioPorId);

router.put("/:id", actualizarUsuario);

router.post("/solicitar-recuperacion", solicitarRecuperacion);
router.post("/restablecer-clave", restablecerClave);

module.exports = router;