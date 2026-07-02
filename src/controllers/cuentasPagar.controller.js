const pool = require("../config/db");

const obtenerMesActual = () => {
    const fecha = new Date();
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, "0");

    return `${anio}-${mes}`;
};

const obtenerFechaActualFormatoSql = (diaCobro) => {
    const fecha = new Date();
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, "0");
    const dia = String(diaCobro).padStart(2, "0");

    return `${anio}-${mes}-${dia}`;
};

const generarEgresosRecurrentesDelMes = async (client) => {
    const mesActual = obtenerMesActual();

    const recurrentes = await client.query(
        `SELECT * FROM egresos_recurrentes
         WHERE activo = TRUE`
    );

    for (const recurrente of recurrentes.rows) {
        const existeCuenta = await client.query(
            `SELECT * FROM cuentas_pagar
             WHERE id_recurrente = $1
             AND mes_aplicado = $2`,
            [
                recurrente.id_recurrente,
                mesActual
            ]
        );

        if (existeCuenta.rows.length === 0) {
            const fechaGenerada = obtenerFechaActualFormatoSql(recurrente.dia_cobro);

            const movimiento = await client.query(
                `INSERT INTO movimientos_financieros
                (tipo, categoria, concepto, fecha, valor, referencia, observacion)
                VALUES ('Egreso', $1, $1, $2, $3, $4, $5)
                RETURNING *`,
                [
                    recurrente.tipo_egreso,
                    fechaGenerada,
                    recurrente.valor,
                    "Egreso recurrente mensual",
                    recurrente.observacion || "Egreso recurrente generado automáticamente"
                ]
            );

            await client.query(
                `INSERT INTO cuentas_pagar
                (tipo_egreso, fecha, valor, estado, observacion, id_movimiento, id_recurrente, mes_aplicado)
                VALUES ($1, $2, $3, 'Registrado', $4, $5, $6, $7)`,
                [
                    recurrente.tipo_egreso,
                    fechaGenerada,
                    recurrente.valor,
                    recurrente.observacion || "Egreso recurrente mensual",
                    movimiento.rows[0].id_movimiento,
                    recurrente.id_recurrente,
                    mesActual
                ]
            );
        }
    }
};

const listarCuentasPagar = async (req, res) => {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        await generarEgresosRecurrentesDelMes(client);

        const resultado = await client.query(
        `SELECT *
        FROM cuentas_pagar
        WHERE estado <> 'Eliminado'
        ORDER BY fecha_registro DESC`
        );

        await client.query("COMMIT");

        res.json({
            mensaje: "Cuentas por pagar consultadas correctamente",
            total: resultado.rows.length,
            cuentas: resultado.rows
        });

    } catch (error) {
        await client.query("ROLLBACK");

        console.error("Error al listar cuentas por pagar:", error);

        res.status(500).json({
            mensaje: "Error al listar cuentas por pagar",
            error: error.message
        });

    } finally {
        client.release();
    }
};

const listarEgresosRecurrentes = async (req, res) => {
    try {
        const resultado = await pool.query(
            "SELECT * FROM egresos_recurrentes ORDER BY fecha_registro DESC"
        );

        res.json({
            mensaje: "Egresos recurrentes consultados correctamente",
            total: resultado.rows.length,
            recurrentes: resultado.rows
        });

    } catch (error) {
        console.error("Error al listar egresos recurrentes:", error);

        res.status(500).json({
            mensaje: "Error al listar egresos recurrentes",
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

        const cuenta = await client.query(
            `INSERT INTO cuentas_pagar
            (tipo_egreso, fecha, valor, estado, observacion, id_movimiento)
            VALUES ($1, $2, $3, 'Registrado', $4, $5)
            RETURNING *`,
            [
                tipo_egreso,
                fecha,
                valor,
                observacion || "Sin observación",
                movimiento.rows[0].id_movimiento
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

const registrarEgresoRecurrente = async (req, res) => {
    const client = await pool.connect();

    try {
        const {
            tipo_egreso,
            fecha_inicio,
            valor,
            dia_cobro,
            observacion
        } = req.body;

        if (!tipo_egreso || !fecha_inicio || valor === undefined) {
            return res.status(400).json({
                mensaje: "Tipo de egreso, fecha de inicio y valor son obligatorios"
            });
        }

        if (Number(valor) <= 0) {
            return res.status(400).json({
                mensaje: "El valor debe ser mayor a cero"
            });
        }

        const diaCobroFinal = dia_cobro || 1;
        const mesAplicado = fecha_inicio.substring(0, 7);

        await client.query("BEGIN");

        const recurrente = await client.query(
            `INSERT INTO egresos_recurrentes
            (tipo_egreso, valor, dia_cobro, fecha_inicio, activo, observacion)
            VALUES ($1, $2, $3, $4, TRUE, $5)
            RETURNING *`,
            [
                tipo_egreso,
                valor,
                diaCobroFinal,
                fecha_inicio,
                observacion || "Egreso mensual recurrente"
            ]
        );

        const movimiento = await client.query(
            `INSERT INTO movimientos_financieros
            (tipo, categoria, concepto, fecha, valor, referencia, observacion)
            VALUES ('Egreso', $1, $1, $2, $3, $4, $5)
            RETURNING *`,
            [
                tipo_egreso,
                fecha_inicio,
                valor,
                "Egreso recurrente mensual",
                observacion || "Primer egreso recurrente registrado"
            ]
        );

        const cuenta = await client.query(
            `INSERT INTO cuentas_pagar
            (tipo_egreso, fecha, valor, estado, observacion, id_movimiento, id_recurrente, mes_aplicado)
            VALUES ($1, $2, $3, 'Registrado', $4, $5, $6, $7)
            RETURNING *`,
            [
                tipo_egreso,
                fecha_inicio,
                valor,
                observacion || "Egreso recurrente mensual",
                movimiento.rows[0].id_movimiento,
                recurrente.rows[0].id_recurrente,
                mesAplicado
            ]
        );

        await client.query("COMMIT");

        res.status(201).json({
            mensaje: "Egreso recurrente registrado correctamente",
            recurrente: recurrente.rows[0],
            cuenta: cuenta.rows[0],
            movimiento: movimiento.rows[0]
        });

    } catch (error) {
        await client.query("ROLLBACK");

        console.error("Error al registrar egreso recurrente:", error);

        res.status(500).json({
            mensaje: "Error al registrar egreso recurrente",
            error: error.message
        });

    } finally {
        client.release();
    }
};

const actualizarCuentaPagar = async (req, res) => {
    const client = await pool.connect();

    try {
        const { id } = req.params;

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

        const cuentaExistente = await client.query(
            "SELECT * FROM cuentas_pagar WHERE id_cuenta_pagar = $1",
            [id]
        );

        if (cuentaExistente.rows.length === 0) {
            await client.query("ROLLBACK");

            return res.status(404).json({
                mensaje: "No se encontró la cuenta por pagar"
            });
        }

        const cuentaAnterior = cuentaExistente.rows[0];

        const cuentaActualizada = await client.query(
            `UPDATE cuentas_pagar
             SET tipo_egreso = $1,
                 fecha = $2,
                 valor = $3,
                 observacion = $4
             WHERE id_cuenta_pagar = $5
             RETURNING *`,
            [
                tipo_egreso,
                fecha,
                valor,
                observacion || "Sin observación",
                id
            ]
        );

        let movimientoActualizado = null;

        if (cuentaAnterior.id_movimiento) {
            movimientoActualizado = await client.query(
                `UPDATE movimientos_financieros
                 SET categoria = $1,
                     concepto = $1,
                     fecha = $2,
                     valor = $3,
                     referencia = $1,
                     observacion = $4
                 WHERE id_movimiento = $5
                 RETURNING *`,
                [
                    tipo_egreso,
                    fecha,
                    valor,
                    observacion || "Egreso actualizado desde cuentas por pagar",
                    cuentaAnterior.id_movimiento
                ]
            );
        } else {
            movimientoActualizado = await client.query(
                `INSERT INTO movimientos_financieros
                (tipo, categoria, concepto, fecha, valor, referencia, observacion)
                VALUES ('Egreso', $1, $1, $2, $3, $1, $4)
                RETURNING *`,
                [
                    tipo_egreso,
                    fecha,
                    valor,
                    observacion || "Egreso actualizado desde cuentas por pagar"
                ]
            );

            await client.query(
                `UPDATE cuentas_pagar
                 SET id_movimiento = $1
                 WHERE id_cuenta_pagar = $2`,
                [
                    movimientoActualizado.rows[0].id_movimiento,
                    id
                ]
            );
        }

        await client.query("COMMIT");

        res.json({
            mensaje: "Cuenta por pagar actualizada correctamente",
            cuenta: cuentaActualizada.rows[0],
            movimiento: movimientoActualizado.rows[0]
        });

    } catch (error) {
        await client.query("ROLLBACK");

        console.error("Error al actualizar cuenta por pagar:", error);

        res.status(500).json({
            mensaje: "Error al actualizar cuenta por pagar",
            error: error.message
        });

    } finally {
        client.release();
    }
};

const cambiarEstadoEgresoRecurrente = async (req, res) => {
    try {
        const { id } = req.params;
        const { activo } = req.body;

        const resultado = await pool.query(
            `UPDATE egresos_recurrentes
             SET activo = $1
             WHERE id_recurrente = $2
             RETURNING *`,
            [
                activo,
                id
            ]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                mensaje: "No se encontró el egreso recurrente"
            });
        }

        res.json({
            mensaje: "Estado de egreso recurrente actualizado correctamente",
            recurrente: resultado.rows[0]
        });

    } catch (error) {
        console.error("Error al cambiar estado de egreso recurrente:", error);

        res.status(500).json({
            mensaje: "Error al cambiar estado de egreso recurrente",
            error: error.message
        });
    }
};

const eliminarCuentaPagar = async (req, res) => {
    const client = await pool.connect();

    try {
        const { id } = req.params;

        await client.query("BEGIN");

        const cuentaExistente = await client.query(
            `SELECT *
             FROM cuentas_pagar
             WHERE id_cuenta_pagar = $1`,
            [id]
        );

        if (cuentaExistente.rows.length === 0) {
            await client.query("ROLLBACK");

            return res.status(404).json({
                mensaje: "No se encontró el egreso"
            });
        }

        const cuenta = cuentaExistente.rows[0];

        if (cuenta.estado === "Eliminado") {
            await client.query("ROLLBACK");

            return res.status(400).json({
                mensaje: "El egreso ya se encuentra eliminado"
            });
        }

        await client.query(
            `UPDATE cuentas_pagar
             SET estado = 'Eliminado',
                 observacion = COALESCE(observacion, '') || ' | Egreso eliminado por administrador'
             WHERE id_cuenta_pagar = $1`,
            [id]
        );

        if (cuenta.id_movimiento) {
            await client.query(
                `DELETE FROM movimientos_financieros
                 WHERE id_movimiento = $1`,
                [cuenta.id_movimiento]
            );

            await client.query(
                `UPDATE cuentas_pagar
                 SET id_movimiento = NULL
                 WHERE id_cuenta_pagar = $1`,
                [id]
            );
        }

        await client.query("COMMIT");

        res.json({
            mensaje: "Egreso eliminado correctamente. Ya no afectará la utilidad.",
            cuenta_eliminada: cuenta
        });

    } catch (error) {
        await client.query("ROLLBACK");

        console.error("Error al eliminar egreso:", error);

        res.status(500).json({
            mensaje: "Error al eliminar egreso",
            error: error.message
        });

    } finally {
        client.release();
    }
};
module.exports = {
    listarCuentasPagar,
    listarEgresosRecurrentes,
    registrarCuentaPagar,
    registrarEgresoRecurrente,
    actualizarCuentaPagar,
    cambiarEstadoEgresoRecurrente,
    eliminarCuentaPagar,
    generarEgresosRecurrentesDelMes
};