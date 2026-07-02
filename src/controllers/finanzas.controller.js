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

        const servicioMasUtilizado = await client.query(
            `SELECT 
                servicio,
                COUNT(*) AS total_usos
             FROM citas
             WHERE estado = 'Finalizado'
             GROUP BY servicio
             ORDER BY total_usos DESC, servicio ASC
             LIMIT 1`
        );

        const servicioMenosUtilizado = await client.query(
            `SELECT 
                servicio,
                COUNT(*) AS total_usos
             FROM citas
             WHERE estado = 'Finalizado'
             GROUP BY servicio
             ORDER BY total_usos ASC, servicio ASC
             LIMIT 1`
        );

        const servicioMayorIngreso = await client.query(
            `SELECT 
                servicio,
                COALESCE(SUM(valor_pagado), 0) AS total_ingresos
             FROM citas
             WHERE estado = 'Finalizado'
             GROUP BY servicio
             ORDER BY total_ingresos DESC, servicio ASC
             LIMIT 1`
        );

        const rankingServicios = await client.query(
            `SELECT 
                servicio,
                COUNT(*) AS total_usos,
                COALESCE(SUM(valor_pagado), 0) AS total_ingresos
             FROM citas
             WHERE estado = 'Finalizado'
             GROUP BY servicio
             ORDER BY total_ingresos DESC, servicio ASC`
        );

        await client.query("COMMIT");

        const totalIngresos = Number(ingresos.rows[0].total);
        const totalEgresos = Number(egresos.rows[0].total);
        const totalPorCobrar = Number(cuentasCobrar.rows[0].total);
        const gananciaNeta = totalIngresos - totalEgresos;

        let servicioMasUtilizadoRespuesta = {
            nombre: "Sin datos",
            total_usos: 0
        };

        if (servicioMasUtilizado.rows.length > 0) {
            servicioMasUtilizadoRespuesta = {
                nombre: servicioMasUtilizado.rows[0].servicio,
                total_usos: Number(servicioMasUtilizado.rows[0].total_usos)
            };
        }

        let servicioMenosUtilizadoRespuesta = {
            nombre: "Sin datos",
            total_usos: 0
        };

        if (servicioMenosUtilizado.rows.length > 0) {
            servicioMenosUtilizadoRespuesta = {
                nombre: servicioMenosUtilizado.rows[0].servicio,
                total_usos: Number(servicioMenosUtilizado.rows[0].total_usos)
            };
        }

        let servicioMayorIngresoRespuesta = {
            nombre: "Sin datos",
            total_ingresos: 0
        };

        if (servicioMayorIngreso.rows.length > 0) {
            servicioMayorIngresoRespuesta = {
                nombre: servicioMayorIngreso.rows[0].servicio,
                total_ingresos: Number(servicioMayorIngreso.rows[0].total_ingresos)
            };
        }

        const rankingServiciosRespuesta = rankingServicios.rows.map(servicio => {
            return {
                servicio: servicio.servicio,
                total_usos: Number(servicio.total_usos),
                total_ingresos: Number(servicio.total_ingresos)
            };
        });

        res.json({
            mensaje: "Resumen financiero consultado correctamente",
            ingresos: totalIngresos,
            egresos: totalEgresos,
            ganancia_neta: gananciaNeta,
            total_por_cobrar: totalPorCobrar,
            citas_hoy: Number(citasHoy.rows[0].total),
            clientes_registrados: Number(clientes.rows[0].total),
            estadisticas_servicios: {
                servicio_mas_utilizado: servicioMasUtilizadoRespuesta,
                servicio_menos_utilizado: servicioMenosUtilizadoRespuesta,
                servicio_mayor_ingreso: servicioMayorIngresoRespuesta,
                ranking_servicios: rankingServiciosRespuesta
            }
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

const obtenerResumenFinancieroMensual = async (req, res) => {
    const client = await pool.connect();

    try {
        let { anio, mes } = req.query;

        if (!anio || !mes) {
            const fechaEcuadorResultado = await client.query(
                `SELECT 
                    EXTRACT(YEAR FROM (NOW() AT TIME ZONE 'America/Guayaquil')) AS anio,
                    EXTRACT(MONTH FROM (NOW() AT TIME ZONE 'America/Guayaquil')) AS mes`
            );

            anio = Number(fechaEcuadorResultado.rows[0].anio);
            mes = Number(fechaEcuadorResultado.rows[0].mes);
        } else {
            anio = Number(anio);
            mes = Number(mes);
        }

        if (!anio || !mes || mes < 1 || mes > 12) {
            return res.status(400).json({
                mensaje: "Año y mes inválidos"
            });
        }

        const fechaInicio = `${anio}-${String(mes).padStart(2, "0")}-01`;

        let anioSiguiente = anio;
        let mesSiguiente = mes + 1;

        if (mesSiguiente === 13) {
            mesSiguiente = 1;
            anioSiguiente = anio + 1;
        }

        const fechaFin = `${anioSiguiente}-${String(mesSiguiente).padStart(2, "0")}-01`;

        await client.query("BEGIN");

        await generarEgresosRecurrentesDelMes(client);

        const ingresos = await client.query(
            `SELECT COALESCE(SUM(valor), 0) AS total
             FROM movimientos_financieros
             WHERE tipo = 'Ingreso'
             AND fecha >= $1
             AND fecha < $2`,
            [fechaInicio, fechaFin]
        );

        const egresos = await client.query(
            `SELECT COALESCE(SUM(valor), 0) AS total
             FROM movimientos_financieros
             WHERE tipo = 'Egreso'
             AND fecha >= $1
             AND fecha < $2`,
            [fechaInicio, fechaFin]
        );

        const cuentasCobrar = await client.query(
            `SELECT COALESCE(SUM(valor_pendiente), 0) AS total
             FROM cuentas_cobrar
             WHERE estado = 'Pendiente'
             AND fecha >= $1
             AND fecha < $2`,
            [fechaInicio, fechaFin]
        );

        const citasHoy = await client.query(
            `SELECT COUNT(*) AS total
             FROM citas
             WHERE fecha = (NOW() AT TIME ZONE 'America/Guayaquil')::date
             AND estado = 'En curso'`
        );

        const clientes = await client.query(
            `SELECT COUNT(*) AS total
             FROM usuarios
             WHERE rol = 'cliente'
             AND estado = TRUE`
        );

        const servicioMasUtilizado = await client.query(
            `SELECT 
                servicio,
                COUNT(*) AS total_usos
             FROM citas
             WHERE estado = 'Finalizado'
             AND fecha >= $1
             AND fecha < $2
             GROUP BY servicio
             ORDER BY total_usos DESC, servicio ASC
             LIMIT 1`,
            [fechaInicio, fechaFin]
        );

        const servicioMenosUtilizado = await client.query(
            `SELECT 
                servicio,
                COUNT(*) AS total_usos
             FROM citas
             WHERE estado = 'Finalizado'
             AND fecha >= $1
             AND fecha < $2
             GROUP BY servicio
             ORDER BY total_usos ASC, servicio ASC
             LIMIT 1`,
            [fechaInicio, fechaFin]
        );

        const servicioMayorIngreso = await client.query(
            `SELECT 
                servicio,
                COALESCE(SUM(valor_pagado), 0) AS total_ingresos
             FROM citas
             WHERE estado = 'Finalizado'
             AND fecha >= $1
             AND fecha < $2
             GROUP BY servicio
             ORDER BY total_ingresos DESC, servicio ASC
             LIMIT 1`,
            [fechaInicio, fechaFin]
        );

        const rankingServicios = await client.query(
            `SELECT 
                servicio,
                COUNT(*) AS total_usos,
                COALESCE(SUM(valor_pagado), 0) AS total_ingresos
             FROM citas
             WHERE estado = 'Finalizado'
             AND fecha >= $1
             AND fecha < $2
             GROUP BY servicio
             ORDER BY total_ingresos DESC, servicio ASC`,
            [fechaInicio, fechaFin]
        );

        await client.query("COMMIT");

        const totalIngresos = Number(ingresos.rows[0].total);
        const totalEgresos = Number(egresos.rows[0].total);
        const totalPorCobrar = Number(cuentasCobrar.rows[0].total);
        const gananciaNeta = totalIngresos - totalEgresos;

        let servicioMasUtilizadoRespuesta = {
            nombre: "Sin datos",
            total_usos: 0
        };

        if (servicioMasUtilizado.rows.length > 0) {
            servicioMasUtilizadoRespuesta = {
                nombre: servicioMasUtilizado.rows[0].servicio,
                total_usos: Number(servicioMasUtilizado.rows[0].total_usos)
            };
        }

        let servicioMenosUtilizadoRespuesta = {
            nombre: "Sin datos",
            total_usos: 0
        };

        if (servicioMenosUtilizado.rows.length > 0) {
            servicioMenosUtilizadoRespuesta = {
                nombre: servicioMenosUtilizado.rows[0].servicio,
                total_usos: Number(servicioMenosUtilizado.rows[0].total_usos)
            };
        }

        let servicioMayorIngresoRespuesta = {
            nombre: "Sin datos",
            total_ingresos: 0
        };

        if (servicioMayorIngreso.rows.length > 0) {
            servicioMayorIngresoRespuesta = {
                nombre: servicioMayorIngreso.rows[0].servicio,
                total_ingresos: Number(servicioMayorIngreso.rows[0].total_ingresos)
            };
        }

        const rankingServiciosRespuesta = rankingServicios.rows.map(servicio => {
            return {
                servicio: servicio.servicio,
                total_usos: Number(servicio.total_usos),
                total_ingresos: Number(servicio.total_ingresos)
            };
        });

        res.json({
            mensaje: "Resumen financiero mensual consultado correctamente",
            anio,
            mes,
            fecha_inicio: fechaInicio,
            fecha_fin: fechaFin,
            ingresos: totalIngresos,
            egresos: totalEgresos,
            ganancia_neta: gananciaNeta,
            total_por_cobrar: totalPorCobrar,
            citas_hoy: Number(citasHoy.rows[0].total),
            clientes_registrados: Number(clientes.rows[0].total),
            estadisticas_servicios: {
                servicio_mas_utilizado: servicioMasUtilizadoRespuesta,
                servicio_menos_utilizado: servicioMenosUtilizadoRespuesta,
                servicio_mayor_ingreso: servicioMayorIngresoRespuesta,
                ranking_servicios: rankingServiciosRespuesta
            }
        });

    } catch (error) {
        await client.query("ROLLBACK");

        console.error("Error al obtener resumen financiero mensual:", error);

        res.status(500).json({
            mensaje: "Error al obtener resumen financiero mensual",
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