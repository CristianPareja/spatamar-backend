const request = require("supertest");
const app = require("../server");
const pool = require("../src/config/db");

describe("Pruebas de caja blanca - Login de usuarios", () => {

    test("Debe rechazar login con campos vacíos", async () => {
        const respuesta = await request(app)
            .post("/api/usuarios/login")
            .send({
                usuario: "",
                clave: ""
            });

        expect([400, 401]).toContain(respuesta.statusCode);
        expect(respuesta.body).toHaveProperty("mensaje");
    });

});

afterAll(async () => {
    await pool.end();
});