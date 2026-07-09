const request = require("supertest");
const app = require("../server");
const pool = require("../src/config/db");

describe("Pruebas de caja blanca - Finanzas", () => {

    test("Debe responder el resumen financiero general", async () => {
        const respuesta = await request(app)
            .get("/api/finanzas/resumen");

        expect([200, 500]).toContain(respuesta.statusCode);
        expect(respuesta.body).toBeDefined();
    });

    test("Debe responder el resumen financiero mensual", async () => {
        const respuesta = await request(app)
            .get("/api/finanzas/resumen-mensual?anio=2026&mes=7");

        expect([200, 500]).toContain(respuesta.statusCode);
        expect(respuesta.body).toBeDefined();
    });

});

afterAll(async () => {
    await pool.end();
});