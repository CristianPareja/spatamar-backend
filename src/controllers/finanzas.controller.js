const pool = require("../config/db");

const obtenerResumenFinanciero = async (req, res) => {
    try {
        const ingresos = await pool.query(
            `SELECT COALESCE(SUM(valor), 0) AS total
             FROM movimientos_financieros
             WHERE tipo = 'Ingreso'`
        );

        const egresos = await pool.query(
            `SELECT COALESCE(SUM(valor), 0) AS total
             FROM movimientos_financieros
             WHERE tipo = 'Egreso'`
        );

        const cuentasCobrar = await pool.query(
            `SELECT COALESCE(SUM(valor_pendiente), 0) AS total
             FROM cuentas_cobrar
             WHERE estado = 'Pendiente'`
        );

        const citasHoy = await pool.query(
            `SELECT COUNT(*) AS total
             FROM citas
             WHERE fecha = CURRENT_DATE
             AND estado = 'En curso'`
        );

        const clientes = await pool.query(
            `SELECT COUNT(*) AS total
             FROM usuarios
             WHERE rol = 'cliente'
             AND estado = TRUE`
        );

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
        console.error("Error al obtener resumen financiero:", error);

        res.status(500).json({
            mensaje: "Error al obtener resumen financiero",
            error: error.message
        });
    }
};

const listarMovimientos = async (req, res) => {
    try {
        const resultado = await pool.query(
            "SELECT * FROM movimientos_financieros ORDER BY fecha_registro DESC"
        );

        res.json({
            mensaje: "Movimientos financieros consultados correctamente",
            total: resultado.rows.length,
            movimientos: resultado.rows
        });

    } catch (error) {
        console.error("Error al listar movimientos financieros:", error);

        res.status(500).json({
            mensaje: "Error al listar movimientos financieros",
            error: error.message
        });
    }
};

module.exports = {
    obtenerResumenFinanciero,
    listarMovimientos
};