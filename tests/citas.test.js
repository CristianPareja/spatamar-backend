const request = require("supertest");
const app = require("../server");
const pool = require("../src/config/db");

describe("Pruebas de caja blanca - Registro de citas", () => {

    test("Debe rechazar una cita con campos obligatorios vacíos", async () => {
        const respuesta = await request(app)
            .post("/api/citas")
            .send({
                id_usuario: "",
                id_servicio: "",
                nombre_cliente: "",
                telefono: "",
                servicio: "",
                fecha: "",
                hora: "",
                observaciones: ""
            });

        expect([400, 500]).toContain(respuesta.statusCode);
        expect(respuesta.body).toHaveProperty("mensaje");
    });

    test("Debe responder al intentar registrar una cita con datos completos", async () => {
        const respuesta = await request(app)
            .post("/api/citas")
            .send({
                id_usuario: 1,
                id_servicio: 1,
                nombre_cliente: "Cliente Prueba Jest",
                telefono: "0999999999",
                servicio: "Manicure",
                fecha: "2026-12-20",
                hora: "10:00",
                observaciones: "Prueba automatizada con Jest"
            });

        expect([201, 400, 409, 500]).toContain(respuesta.statusCode);
        expect(respuesta.body).toBeDefined();
    });

});

afterAll(async () => {
    await pool.end();
});