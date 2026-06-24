const pool = require("../config/db");

const {
    generarEgresosRecurrentesDelMes
} = require("./cuentasPagar.controller");

const obtenerResumenFinanciero = async (req, res) => {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        await generarEgresosRecurrentesDelMes(client);

        const ingresos = await client.query(
            `SELECT COALESCE(SUM(valor), 0) AS total
             FROM movimientos_financieros
             WHERE tipo = 'Ingreso'`
        );

        const egresos = await client.query(
            `SELECT COALESCE(SUM(valor), 0) AS total
             FROM movimientos_financieros
             WHERE tipo = 'Egreso'`
        );

        const cuentasCobrar = await client.query(
            `SELECT COALESCE(SUM(valor_pendiente), 0) AS total
             FROM cuentas_cobrar
             WHERE estado = 'Pendiente'`
        );

        const citasHoy = await client.query(
            `SELECT COUNT(*) AS total
             FROM citas
             WHERE fecha = CURRENT_DATE
             AND estado = 'En curso'`
        );

        const clientes = await client.query(
            `SELECT COUNT(*) AS total
             FROM usuarios
             WHERE rol = 'cliente'
             AND estado = TRUE`
        );

        await client.query("COMMIT");

        const totalIngresos = Number(ingresos.rows[0].total);
        const totalEgresos = Number(egresos.rows[0].total);
        const totalPorCobrar = Number(cuentasCobrar.rows[0].total);
        const gananciaNeta = totalIngresos - totalEgresos;

        res.json({
            mensaje: "Resumen financiero consultado correctamente",
            ingresos: totalIngresos,
            egresos: totalEgresos,
            ganancia_neta: gananciaNeta,
            total_por_cobrar: totalPorCobrar,
            citas_hoy: Number(citasHoy.rows[0].total),
            clientes_registrados: Number(clientes.rows[0].total)
        });

    } catch (error) {
        await client.query("ROLLBACK");

        console.error("Error al obtener resumen financiero:", error);

        res.status(500).json({
            mensaje: "Error al obtener resumen financiero",
            error: error.message
        });

    } finally {
        client.release();
    }
};

const listarMovimientos = async (req, res) => {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        await generarEgresosRecurrentesDelMes(client);

        const resultado = await client.query(
            "SELECT * FROM movimientos_financieros ORDER BY fecha_registro DESC"
        );

        await client.query("COMMIT");

        res.json({
            mensaje: "Movimientos financieros consultados correctamente",
            total: resultado.rows.length,
            movimientos: resultado.rows
        });

    } catch (error) {
        await client.query("ROLLBACK");

        console.error("Error al listar movimientos financieros:", error);

        res.status(500).json({
            mensaje: "Error al listar movimientos financieros",
            error: error.message
        });

    } finally {
        client.release();
    }
};

module.exports = {
    obtenerResumenFinanciero,
    listarMovimientos
};