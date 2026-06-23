const pool = require("../config/db");

const listarCuentasCobrar = async (req, res) => {
    try {
        const resultado = await pool.query(
            "SELECT * FROM cuentas_cobrar ORDER BY fecha_registro DESC"
        );

        res.json({
            mensaje: "Cuentas por cobrar consultadas correctamente",
            total: resultado.rows.length,
            cuentas: resultado.rows
        });

    } catch (error) {
        console.error("Error al listar cuentas por cobrar:", error);

        res.status(500).json({
            mensaje: "Error al listar cuentas por cobrar",
            error: error.message
        });
    }
};

const listarCuentasCobrarPorUsuario = async (req, res) => {
    try {
        const { id_usuario } = req.params;

        const resultado = await pool.query(
            `SELECT * FROM cuentas_cobrar
             WHERE id_usuario = $1
             AND estado = 'Pendiente'
             ORDER BY fecha DESC`,
            [id_usuario]
        );

        res.json({
            mensaje: "Cuentas pendientes del usuario consultadas correctamente",
            total: resultado.rows.length,
            cuentas: resultado.rows
        });

    } catch (error) {
        console.error("Error al consultar cuentas del usuario:", error);

        res.status(500).json({
            mensaje: "Error al consultar cuentas del usuario",
            error: error.message
        });
    }
};

const registrarCuentaCobrar = async (req, res) => {
    try {
        const {
            id_usuario,
            nombre_cliente,
            correo_cliente,
            concepto,
            fecha,
            valor_pendiente,
            observacion
        } = req.body;

        if (!id_usuario || !nombre_cliente || !correo_cliente || !concepto || !fecha || valor_pendiente === undefined) {
            return res.status(400).json({
                mensaje: "Cliente, concepto, fecha y valor pendiente son obligatorios"
            });
        }

        if (Number(valor_pendiente) <= 0) {
            return res.status(400).json({
                mensaje: "El valor pendiente debe ser mayor a cero"
            });
        }

        const usuarioExiste = await pool.query(
            "SELECT id_usuario FROM usuarios WHERE id_usuario = $1",
            [id_usuario]
        );

        if (usuarioExiste.rows.length === 0) {
            return res.status(404).json({
                mensaje: "El cliente seleccionado no existe"
            });
        }

        const resultado = await pool.query(
            `INSERT INTO cuentas_cobrar
            (id_usuario, nombre_cliente, correo_cliente, concepto, fecha, valor_pendiente, estado, observacion)
            VALUES ($1, $2, $3, $4, $5, $6, 'Pendiente', $7)
            RETURNING *`,
            [
                id_usuario,
                nombre_cliente,
                correo_cliente,
                concepto,
                fecha,
                valor_pendiente,
                observacion || "Sin observación"
            ]
        );

        res.status(201).json({
            mensaje: "Cuenta por cobrar registrada correctamente",
            cuenta: resultado.rows[0]
        });

    } catch (error) {
        console.error("Error al registrar cuenta por cobrar:", error);

        res.status(500).json({
            mensaje: "Error al registrar cuenta por cobrar",
            error: error.message
        });
    }
};

const marcarCuentaComoPagada = async (req, res) => {
    try {
        const { id } = req.params;

        const cuentaExiste = await pool.query(
            "SELECT * FROM cuentas_cobrar WHERE id_cuenta_cobrar = $1",
            [id]
        );

        if (cuentaExiste.rows.length === 0) {
            return res.status(404).json({
                mensaje: "Cuenta por cobrar no encontrada"
            });
        }

        const cuenta = cuentaExiste.rows[0];

        if (cuenta.estado !== "Pendiente") {
            return res.status(400).json({
                mensaje: "La cuenta ya no se encuentra pendiente"
            });
        }

        const cuentaActualizada = await pool.query(
            `UPDATE cuentas_cobrar
             SET estado = 'Pagado'
             WHERE id_cuenta_cobrar = $1
             RETURNING *`,
            [id]
        );

        const movimiento = await pool.query(
            `INSERT INTO movimientos_financieros
            (tipo, categoria, concepto, fecha, valor, referencia, observacion)
            VALUES ('Ingreso', 'Cuenta por cobrar', $1, CURRENT_DATE, $2, $3, 'Pago registrado desde cuentas por cobrar')
            RETURNING *`,
            [
                cuenta.concepto,
                cuenta.valor_pendiente,
                cuenta.nombre_cliente
            ]
        );

        res.json({
            mensaje: "Cuenta marcada como pagada e ingreso registrado correctamente",
            cuenta: cuentaActualizada.rows[0],
            movimiento: movimiento.rows[0]
        });

    } catch (error) {
        console.error("Error al marcar cuenta como pagada:", error);

        res.status(500).json({
            mensaje: "Error al marcar cuenta como pagada",
            error: error.message
        });
    }
};

module.exports = {
    listarCuentasCobrar,
    listarCuentasCobrarPorUsuario,
    registrarCuentaCobrar,
    marcarCuentaComoPagada
};