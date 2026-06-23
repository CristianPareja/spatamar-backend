const pool = require("../config/db");

const listarCuentasPagar = async (req, res) => {
    try {
        const resultado = await pool.query(
            "SELECT * FROM cuentas_pagar ORDER BY fecha_registro DESC"
        );

        res.json({
            mensaje: "Cuentas por pagar consultadas correctamente",
            total: resultado.rows.length,
            cuentas: resultado.rows
        });

    } catch (error) {
        console.error("Error al listar cuentas por pagar:", error);

        res.status(500).json({
            mensaje: "Error al listar cuentas por pagar",
            error: error.message
        });
    }
};

const registrarCuentaPagar = async (req, res) => {
    const client = await pool.connect();

    try {
        const {
            tipo_egreso,
            fecha,
            valor,
            observacion
        } = req.body;

        if (!tipo_egreso || !fecha || valor === undefined) {
            return res.status(400).json({
                mensaje: "Tipo de egreso, fecha y valor son obligatorios"
            });
        }

        if (Number(valor) <= 0) {
            return res.status(400).json({
                mensaje: "El valor debe ser mayor a cero"
            });
        }

        await client.query("BEGIN");

        const cuenta = await client.query(
            `INSERT INTO cuentas_pagar
            (tipo_egreso, fecha, valor, estado, observacion)
            VALUES ($1, $2, $3, 'Registrado', $4)
            RETURNING *`,
            [
                tipo_egreso,
                fecha,
                valor,
                observacion || "Sin observación"
            ]
        );

        const movimiento = await client.query(
            `INSERT INTO movimientos_financieros
            (tipo, categoria, concepto, fecha, valor, referencia, observacion)
            VALUES ('Egreso', $1, $1, $2, $3, $1, $4)
            RETURNING *`,
            [
                tipo_egreso,
                fecha,
                valor,
                observacion || "Egreso registrado desde cuentas por pagar"
            ]
        );

        await client.query("COMMIT");

        res.status(201).json({
            mensaje: "Cuenta por pagar registrada y egreso generado correctamente",
            cuenta: cuenta.rows[0],
            movimiento: movimiento.rows[0]
        });

    } catch (error) {
        await client.query("ROLLBACK");

        console.error("Error al registrar cuenta por pagar:", error);

        res.status(500).json({
            mensaje: "Error al registrar cuenta por pagar",
            error: error.message
        });

    } finally {
        client.release();
    }
};

module.exports = {
    listarCuentasPagar,
    registrarCuentaPagar
};