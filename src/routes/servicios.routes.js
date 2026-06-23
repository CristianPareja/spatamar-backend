const express = require("express");
const router = express.Router();

const {
    listarServicios,
    listarServiciosActivos,
    registrarServicio,
    actualizarServicio,
    cambiarEstadoServicio
} = require("../controllers/servicios.controller");

router.get("/", listarServicios);
router.get("/activos", listarServiciosActivos);
router.post("/", registrarServicio);
router.put("/:id", actualizarServicio);
router.patch("/:id/estado", cambiarEstadoServicio);

module.exports = router;