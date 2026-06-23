const express = require("express");
const router = express.Router();

const {
    listarCitas,
    listarCitasPorFecha,
    buscarCitasPorCliente,
    listarCitasPorUsuario,
    registrarCita,
    finalizarCita,
    cancelarCita
} = require("../controllers/citas.controller");

router.get("/", listarCitas);
router.get("/fecha/:fecha", listarCitasPorFecha);
router.get("/cliente/:cliente", buscarCitasPorCliente);
router.get("/usuario/:id_usuario", listarCitasPorUsuario);
router.post("/", registrarCita);
router.patch("/:id/finalizar", finalizarCita);
router.patch("/:id/cancelar", cancelarCita);

module.exports = router;