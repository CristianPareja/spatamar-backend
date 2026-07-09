const express = require("express");
const cors = require("cors");
require("dotenv").config();

const pool = require("./src/config/db");

const usuariosRoutes = require("./src/routes/usuarios.routes");
const serviciosRoutes = require("./src/routes/servicios.routes");
const citasRoutes = require("./src/routes/citas.routes");
const cuentasCobrarRoutes = require("./src/routes/cuentasCobrar.routes");
const cuentasPagarRoutes = require("./src/routes/cuentasPagar.routes");
const finanzasRoutes = require("./src/routes/finanzas.routes");

const { verificarConfiguracionCorreo } = require("./src/config/email");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.json({
        mensaje: "API REST Spa TAMAR funcionando correctamente",
        estado: "OK"
    });
});

app.get("/api/prueba", (req, res) => {
    res.json({
        mensaje: "Conexion exitosa con la API del Spa TAMAR",
        backend: "Node.js + Express",
        baseDatos: "PostgreSQL"
    });
});

app.get("/api/prueba-db", async (req, res) => {
    try {
        const resultado = await pool.query("SELECT NOW() AS fecha_servidor");

        res.json({
            mensaje: "Conexion exitosa con PostgreSQL",
            baseDatos: "spatamar_db",
            fechaServidor: resultado.rows[0].fecha_servidor
        });

    } catch (error) {
        console.error("Error al conectar con PostgreSQL:", error);

        res.status(500).json({
            mensaje: "Error al conectar con PostgreSQL",
            error: error.message
        });
    }
});

app.use("/api/usuarios", usuariosRoutes);
app.use("/api/servicios", serviciosRoutes);
app.use("/api/citas", citasRoutes);
app.use("/api/cuentas-cobrar", cuentasCobrarRoutes);
app.use("/api/cuentas-pagar", cuentasPagarRoutes);
app.use("/api/finanzas", finanzasRoutes);

const PORT = process.env.PORT || 3000;

/*
    Esta condición permite que el servidor se levante normalmente
    cuando se ejecuta con npm start o en Render.

    Pero cuando se ejecuten pruebas con Jest y Supertest,
    NODE_ENV será "test", por lo tanto no se ejecutará app.listen().
*/
if (process.env.NODE_ENV !== "test") {
    app.listen(PORT, "0.0.0.0", async () => {
        console.log("Servidor Spa TAMAR ejecutandose en el puerto " + PORT);

        try {
            await verificarConfiguracionCorreo();
        } catch (error) {
            console.error("Error al verificar la configuracion del correo:", error.message);
        }
    });
}

/*
    Exportamos app para que Supertest pueda usar el backend
    durante las pruebas automatizadas.
*/
module.exports = app;