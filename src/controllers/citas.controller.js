const pool = require("../config/db");

const listarCitas = async (req, res) => {
    try {
        const resultado = await pool.query(
            "SELECT * FROM citas ORDER BY fecha ASC, hora ASC"
        );

        res.json({
            mensaje: "Citas consultadas correctamente",
            total: resultado.rows.length,
            citas: resultado.rows
        });

    } catch (error) {
        console.error("Error al listar citas:", error);

        res.status(500).json({
            mensaje: "Error al listar citas",
            error: error.message
        });
    }
};

const listarCitasPorFecha = async (req, res) => {
    try {
        const { fecha } = req.params;

        const resultado = await pool.query(
            "SELECT * FROM citas WHERE fecha = $1 ORDER BY hora ASC",
            [fecha]
        );

        res.json({
            mensaje: "Citas por fecha consultadas correctamente",
            fecha: fecha,
            total: resultado.rows.length,
            citas: resultado.rows
        });

    } catch (error) {
        console.error("Error al listar citas por fecha:", error);

        res.status(500).json({
            mensaje: "Error al listar citas por fecha",
            error: error.message
        });
    }
};

const buscarCitasPorCliente = async (req, res) => {
    try {
        const { cliente } = req.params;

        const resultado = await pool.query(
            `SELECT * FROM citas
             WHERE LOWER(nombre_cliente) LIKE LOWER($1)
             ORDER BY fecha ASC, hora ASC`,
            [`%${cliente}%`]
        );

        res.json({
            mensaje: "Citas por cliente consultadas correctamente",
            busqueda: cliente,
            total: resultado.rows.length,
            citas: resultado.rows
        });

    } catch (error) {
        console.error("Error al buscar citas por cliente:", error);

        res.status(500).json({
            mensaje: "Error al buscar citas por cliente",
            error: error.message
        });
    }
};

const registrarCita = async (req, res) => {
    try {
        const {
            id_usuario,
            id_servicio,
            nombre_cliente,
            telefono,
            servicio,
            fecha,
            hora,
            observaciones
        } = req.body;

        if (!nombre_cliente || !telefono || !servicio || !fecha || !hora) {
            return res.status(400).json({
                mensaje: "Nombre, teléfono, servicio, fecha y hora son obligatorios"
            });
        }

        const cruce = await pool.query(
            `SELECT id_cita FROM citas
             WHERE fecha = $1
             AND hora = $2
             AND estado = 'En curso'`,
            [fecha, hora]
        );

        if (cruce.rows.length > 0) {
            return res.status(409).json({
                mensaje: "Ya existe una cita registrada en esa fecha y hora"
            });
        }

        const resultado = await pool.query(
            `INSERT INTO citas
            (id_usuario, id_servicio, nombre_cliente, telefono, servicio, fecha, hora, estado, observaciones)
            VALUES ($1, $2, $3, $4, $5, $6, $7, 'En curso', $8)
            RETURNING *`,
            [
                id_usuario || null,
                id_servicio || null,
                nombre_cliente,
                telefono,
                servicio,
                fecha,
                hora,
                observaciones || "Sin observaciones"
            ]
        );

        res.status(201).json({
            mensaje: "Cita registrada correctamente",
            cita: resultado.rows[0]
        });

    } catch (error) {
        console.error("Error al registrar cita:", error);

        res.status(500).json({
            mensaje: "Error al registrar cita",
            error: error.message
        });
    }
};

const finalizarCita = async (req, res) => {
    try {
        const { id } = req.params;
        const { valor_cobrado } = req.body;

        if (valor_cobrado === undefined || Number(valor_cobrado) <= 0) {
            return res.status(400).json({
                mensaje: "Debe ingresar un valor cobrado válido"
            });
        }

        const citaExiste = await pool.query(
            "SELECT * FROM citas WHERE id_cita = $1",
            [id]
        );

        if (citaExiste.rows.length === 0) {
            return res.status(404).json({
                mensaje: "Cita no encontrada"
            });
        }

        const cita = citaExiste.rows[0];

        if (cita.estado !== "En curso") {
            return res.status(400).json({
                mensaje: "Solo se pueden finalizar citas en curso"
            });
        }

        const citaActualizada = await pool.query(
            `UPDATE citas
             SET estado = 'Finalizado'
             WHERE id_cita = $1
             RETURNING *`,
            [id]
        );

        const movimiento = await pool.query(
            `INSERT INTO movimientos_financieros
            (tipo, categoria, concepto, fecha, valor, referencia, observacion)
            VALUES ('Ingreso', 'Cita finalizada', $1, CURRENT_DATE, $2, $3, 'Ingreso registrado al finalizar cita')
            RETURNING *`,
            [
                cita.servicio,
                valor_cobrado,
                cita.nombre_cliente
            ]
        );

        res.json({
            mensaje: "Cita finalizada e ingreso registrado correctamente",
            cita: citaActualizada.rows[0],
            movimiento: movimiento.rows[0]
        });

    } catch (error) {
        console.error("Error al finalizar cita:", error);

        res.status(500).json({
            mensaje: "Error al finalizar cita",
            error: error.message
        });
    }
};

const cancelarCita = async (req, res) => {
    try {
        const { id } = req.params;

        const citaExiste = await pool.query(
            "SELECT * FROM citas WHERE id_cita = $1",
            [id]
        );

        if (citaExiste.rows.length === 0) {
            return res.status(404).json({
                mensaje: "Cita no encontrada"
            });
        }

        const cita = citaExiste.rows[0];

        if (cita.estado !== "En curso") {
            return res.status(400).json({
                mensaje: "Solo se pueden cancelar citas en curso"
            });
        }

        const resultado = await pool.query(
            `UPDATE citas
             SET estado = 'Cancelado'
             WHERE id_cita = $1
             RETURNING *`,
            [id]
        );

        res.json({
            mensaje: "Cita cancelada correctamente",
            cita: resultado.rows[0]
        });

    } catch (error) {
        console.error("Error al cancelar cita:", error);

        res.status(500).json({
            mensaje: "Error al cancelar cita",
            error: error.message
        });
    }
};
const listarCitasPorUsuario = async (req, res) => {
    try {
        const { id_usuario } = req.params;

        const resultado = await pool.query(
            `SELECT * FROM citas
             WHERE id_usuario = $1
             ORDER BY fecha ASC, hora ASC`,
            [id_usuario]
        );

        res.json({
            mensaje: "Citas del usuario consultadas correctamente",
            id_usuario: id_usuario,
            total: resultado.rows.length,
            citas: resultado.rows
        });

    } catch (error) {
        console.error("Error al listar citas por usuario:", error);

        res.status(500).json({
            mensaje: "Error al listar citas por usuario",
            error: error.message
        });
    }
};
module.exports = {
    listarCitas,
    listarCitasPorFecha,
    buscarCitasPorCliente,
    listarCitasPorUsuario,
    registrarCita,
    finalizarCita,
    cancelarCita
};