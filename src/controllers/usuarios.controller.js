const pool = require("../config/db");

const listarUsuarios = async (req, res) => {
    try {
        const resultado = await pool.query(
            "SELECT id_usuario, nombre, apellido, telefono, correo, usuario, rol, estado, fecha_registro FROM usuarios ORDER BY id_usuario ASC"
        );

        res.json({
            mensaje: "Usuarios consultados correctamente",
            total: resultado.rows.length,
            usuarios: resultado.rows
        });

    } catch (error) {
        console.error("Error al listar usuarios:", error);

        res.status(500).json({
            mensaje: "Error al listar usuarios",
            error: error.message
        });
    }
};

const registrarUsuario = async (req, res) => {
    try {
        const {
            nombre,
            apellido,
            telefono,
            correo,
            usuario,
            clave
        } = req.body;

        if (!nombre || !apellido || !telefono || !correo || !usuario || !clave) {
            return res.status(400).json({
                mensaje: "Todos los campos son obligatorios"
            });
        }

        const existe = await pool.query(
            "SELECT id_usuario FROM usuarios WHERE correo = $1 OR usuario = $2",
            [correo, usuario]
        );

        if (existe.rows.length > 0) {
            return res.status(409).json({
                mensaje: "Ya existe un usuario registrado con ese correo o nombre de usuario"
            });
        }

        const resultado = await pool.query(
            `INSERT INTO usuarios 
            (nombre, apellido, telefono, correo, usuario, clave, rol, estado)
            VALUES ($1, $2, $3, $4, $5, $6, 'cliente', TRUE)
            RETURNING id_usuario, nombre, apellido, telefono, correo, usuario, rol, estado`,
            [nombre, apellido, telefono, correo, usuario, clave]
        );

        res.status(201).json({
            mensaje: "Usuario registrado correctamente",
            usuario: resultado.rows[0]
        });

    } catch (error) {
        console.error("Error al registrar usuario:", error);

        res.status(500).json({
            mensaje: "Error al registrar usuario",
            error: error.message
        });
    }
};

const loginUsuario = async (req, res) => {
    try {
        const { usuarioOCorreo, clave } = req.body;

        if (!usuarioOCorreo || !clave) {
            return res.status(400).json({
                mensaje: "Usuario/correo y clave son obligatorios"
            });
        }

        const resultado = await pool.query(
            `SELECT id_usuario, nombre, apellido, telefono, correo, usuario, rol, estado
             FROM usuarios
             WHERE (usuario = $1 OR correo = $1)
             AND clave = $2
             AND estado = TRUE`,
            [usuarioOCorreo, clave]
        );

        if (resultado.rows.length === 0) {
            return res.status(401).json({
                mensaje: "Usuario o contraseña incorrectos"
            });
        }

        res.json({
            mensaje: "Login correcto",
            usuario: resultado.rows[0]
        });

    } catch (error) {
        console.error("Error al iniciar sesión:", error);

        res.status(500).json({
            mensaje: "Error al iniciar sesión",
            error: error.message
        });
    }
};

module.exports = {
    listarUsuarios,
    registrarUsuario,
    loginUsuario
};