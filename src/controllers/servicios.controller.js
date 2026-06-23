const pool = require("../config/db");

const listarServicios = async (req, res) => {
    try {
        const resultado = await pool.query(
            "SELECT * FROM servicios ORDER BY id_servicio ASC"
        );

        res.json({
            mensaje: "Servicios consultados correctamente",
            total: resultado.rows.length,
            servicios: resultado.rows
        });

    } catch (error) {
        console.error("Error al listar servicios:", error);

        res.status(500).json({
            mensaje: "Error al listar servicios",
            error: error.message
        });
    }
};

const listarServiciosActivos = async (req, res) => {
    try {
        const resultado = await pool.query(
            "SELECT * FROM servicios WHERE activo = TRUE ORDER BY id_servicio ASC"
        );

        res.json({
            mensaje: "Servicios activos consultados correctamente",
            total: resultado.rows.length,
            servicios: resultado.rows
        });

    } catch (error) {
        console.error("Error al listar servicios activos:", error);

        res.status(500).json({
            mensaje: "Error al listar servicios activos",
            error: error.message
        });
    }
};

const registrarServicio = async (req, res) => {
    try {
        const { nombre, descripcion, precio } = req.body;

        if (!nombre || !descripcion || precio === undefined) {
            return res.status(400).json({
                mensaje: "Nombre, descripción y precio son obligatorios"
            });
        }

        if (Number(precio) <= 0) {
            return res.status(400).json({
                mensaje: "El precio debe ser mayor a cero"
            });
        }

        const existe = await pool.query(
            "SELECT id_servicio FROM servicios WHERE LOWER(nombre) = LOWER($1)",
            [nombre]
        );

        if (existe.rows.length > 0) {
            return res.status(409).json({
                mensaje: "Ya existe un servicio con ese nombre"
            });
        }

        const resultado = await pool.query(
            `INSERT INTO servicios 
            (nombre, descripcion, precio, activo)
            VALUES ($1, $2, $3, TRUE)
            RETURNING *`,
            [nombre, descripcion, precio]
        );

        res.status(201).json({
            mensaje: "Servicio registrado correctamente",
            servicio: resultado.rows[0]
        });

    } catch (error) {
        console.error("Error al registrar servicio:", error);

        res.status(500).json({
            mensaje: "Error al registrar servicio",
            error: error.message
        });
    }
};

const actualizarServicio = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, descripcion, precio } = req.body;

        if (!nombre || !descripcion || precio === undefined) {
            return res.status(400).json({
                mensaje: "Nombre, descripción y precio son obligatorios"
            });
        }

        if (Number(precio) <= 0) {
            return res.status(400).json({
                mensaje: "El precio debe ser mayor a cero"
            });
        }

        const existeServicio = await pool.query(
            "SELECT id_servicio FROM servicios WHERE id_servicio = $1",
            [id]
        );

        if (existeServicio.rows.length === 0) {
            return res.status(404).json({
                mensaje: "Servicio no encontrado"
            });
        }

        const existeNombre = await pool.query(
            "SELECT id_servicio FROM servicios WHERE LOWER(nombre) = LOWER($1) AND id_servicio <> $2",
            [nombre, id]
        );

        if (existeNombre.rows.length > 0) {
            return res.status(409).json({
                mensaje: "Ya existe otro servicio con ese nombre"
            });
        }

        const resultado = await pool.query(
            `UPDATE servicios
             SET nombre = $1,
                 descripcion = $2,
                 precio = $3
             WHERE id_servicio = $4
             RETURNING *`,
            [nombre, descripcion, precio, id]
        );

        res.json({
            mensaje: "Servicio actualizado correctamente",
            servicio: resultado.rows[0]
        });

    } catch (error) {
        console.error("Error al actualizar servicio:", error);

        res.status(500).json({
            mensaje: "Error al actualizar servicio",
            error: error.message
        });
    }
};

const cambiarEstadoServicio = async (req, res) => {
    try {
        const { id } = req.params;
        const { activo } = req.body;

        if (activo === undefined) {
            return res.status(400).json({
                mensaje: "El campo activo es obligatorio"
            });
        }

        const existeServicio = await pool.query(
            "SELECT id_servicio FROM servicios WHERE id_servicio = $1",
            [id]
        );

        if (existeServicio.rows.length === 0) {
            return res.status(404).json({
                mensaje: "Servicio no encontrado"
            });
        }

        const resultado = await pool.query(
            `UPDATE servicios
             SET activo = $1
             WHERE id_servicio = $2
             RETURNING *`,
            [activo, id]
        );

        res.json({
            mensaje: activo ? "Servicio habilitado correctamente" : "Servicio deshabilitado correctamente",
            servicio: resultado.rows[0]
        });

    } catch (error) {
        console.error("Error al cambiar estado del servicio:", error);

        res.status(500).json({
            mensaje: "Error al cambiar estado del servicio",
            error: error.message
        });
    }
};

module.exports = {
    listarServicios,
    listarServiciosActivos,
    registrarServicio,
    actualizarServicio,
    cambiarEstadoServicio
};