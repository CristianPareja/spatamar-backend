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
        `SELECT 
            id_cita,
            nombre_cliente,
            servicio,
            hora
        FROM citas
        WHERE fecha = $1
        AND estado = 'En curso'
        AND hora BETWEEN ($2::time - INTERVAL '1 hour')
                  AND ($2::time + INTERVAL '1 hour')
        LIMIT 1`,
        [fecha, hora]
    );

    if (cruce.rows.length > 0) {
        return res.status(409).json({
            mensaje: "No se puede agendar la cita porque existe otra cita dentro del rango de una hora antes o una hora después.",
            cita_existente: cruce.rows[0]
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

const obtenerServicioDeLaCita = async (client, cita) => {
    let servicioResultado;

    if (cita.id_servicio) {
        servicioResultado = await client.query(
            `SELECT * FROM servicios
             WHERE id_servicio = $1`,
            [cita.id_servicio]
        );

        if (servicioResultado.rows.length > 0) {
            return servicioResultado.rows[0];
        }
    }

    servicioResultado = await client.query(
        `SELECT * FROM servicios
         WHERE LOWER(nombre) = LOWER($1)
         LIMIT 1`,
        [cita.servicio]
    );

    if (servicioResultado.rows.length > 0) {
        return servicioResultado.rows[0];
    }

    return null;
};

const obtenerCorreoCliente = async (client, cita) => {
    if (!cita.id_usuario) {
        return "cliente_no_registrado@spatamar.local";
    }

    const usuarioResultado = await client.query(
        `SELECT correo
         FROM usuarios
         WHERE id_usuario = $1`,
        [cita.id_usuario]
    );

    if (usuarioResultado.rows.length === 0) {
        return "cliente_no_registrado@spatamar.local";
    }

    return usuarioResultado.rows[0].correo;
};

const finalizarCita = async (req, res) => {
    const client = await pool.connect();

    try {
        const { id } = req.params;
        const { valor_cobrado } = req.body;

        if (valor_cobrado === undefined || valor_cobrado === null || valor_cobrado === "") {
            return res.status(400).json({
                mensaje: "Debe ingresar el valor pagado por el cliente"
            });
        }

        const valorPagado = Number(valor_cobrado);

        if (Number.isNaN(valorPagado) || valorPagado < 0) {
            return res.status(400).json({
                mensaje: "El valor pagado debe ser un número válido igual o mayor a cero"
            });
        }

        await client.query("BEGIN");

        const citaExiste = await client.query(
            "SELECT * FROM citas WHERE id_cita = $1",
            [id]
        );

        if (citaExiste.rows.length === 0) {
            await client.query("ROLLBACK");

            return res.status(404).json({
                mensaje: "Cita no encontrada"
            });
        }

        const cita = citaExiste.rows[0];

        if (cita.estado !== "En curso") {
            await client.query("ROLLBACK");

            return res.status(400).json({
                mensaje: "Solo se pueden finalizar citas en curso"
            });
        }

        const servicioEncontrado = await obtenerServicioDeLaCita(client, cita);

        if (!servicioEncontrado) {
            await client.query("ROLLBACK");

            return res.status(404).json({
                mensaje: "No se encontró el servicio asociado a la cita"
            });
        }

        const precioServicio = Number(servicioEncontrado.precio);

        if (valorPagado > precioServicio) {
            await client.query("ROLLBACK");

            return res.status(400).json({
                mensaje: "El valor pagado no puede ser mayor al precio del servicio"
            });
        }

        const saldoPendiente = Number((precioServicio - valorPagado).toFixed(2));

        const citaActualizada = await client.query(
            `UPDATE citas
             SET estado = 'Finalizado',
                 precio_servicio = $1,
                 valor_pagado = $2,
                 saldo_pendiente = $3
             WHERE id_cita = $4
             RETURNING *`,
            [
                precioServicio,
                valorPagado,
                saldoPendiente,
                id
            ]
        );

        let movimiento = null;

        if (valorPagado > 0) {
            const movimientoResultado = await client.query(
                `INSERT INTO movimientos_financieros
                (tipo, categoria, concepto, fecha, valor, referencia, observacion)
                VALUES ('Ingreso', 'Cita finalizada', $1, CURRENT_DATE, $2, $3, $4)
                RETURNING *`,
                [
                    cita.servicio,
                    valorPagado,
                    cita.nombre_cliente,
                    "Ingreso registrado automáticamente al finalizar cita"
                ]
            );

            movimiento = movimientoResultado.rows[0];
        }

        let cuentaCobrar = null;

        if (saldoPendiente > 0) {
            const correoCliente = await obtenerCorreoCliente(client, cita);

            const cuentaResultado = await client.query(
                `INSERT INTO cuentas_cobrar
                (id_usuario, nombre_cliente, correo_cliente, concepto, fecha, valor_pendiente, estado, observacion)
                VALUES ($1, $2, $3, $4, CURRENT_DATE, $5, 'Pendiente', $6)
                RETURNING *`,
                [
                    cita.id_usuario || null,
                    cita.nombre_cliente,
                    correoCliente,
                    "Saldo pendiente por servicio: " + cita.servicio,
                    saldoPendiente,
                    "Cuenta por cobrar generada automáticamente al finalizar una cita con pago parcial"
                ]
            );

            cuentaCobrar = cuentaResultado.rows[0];
        }

        await client.query("COMMIT");

        res.json({
            mensaje: "Cita finalizada correctamente",
            cita: citaActualizada.rows[0],
            precio_servicio: precioServicio,
            valor_pagado: valorPagado,
            saldo_pendiente: saldoPendiente,
            movimiento: movimiento,
            cuenta_cobrar: cuentaCobrar
        });

    } catch (error) {
        await client.query("ROLLBACK");

        console.error("Error al finalizar cita:", error);

        res.status(500).json({
            mensaje: "Error al finalizar cita",
            error: error.message
        });

    } finally {
        client.release();
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