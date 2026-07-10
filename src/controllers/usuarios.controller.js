const pool = require("../config/db");
const bcrypt = require("bcrypt");
const { enviarCorreoRecuperacion } = require("../config/email");

const generarUsuario = (nombre, apellido) => {
    const nombreLimpio = nombre.toLowerCase().trim().replace(/\s+/g, "");
    const apellidoLimpio = apellido.toLowerCase().trim().replace(/\s+/g, "");
    const numero = Math.floor(100 + Math.random() * 900);

    return nombreLimpio + "." + apellidoLimpio + numero;
};

const generarCodigoRecuperacion = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

const registrarUsuario = async (req, res) => {
    try {
        const {
            nombre,
            apellido,
            telefono,
            correo,
            clave,
            rol
        } = req.body;

        if (!nombre || !apellido || !telefono || !correo || !clave) {
            return res.status(400).json({
                mensaje: "Todos los campos son obligatorios"
            });
        }

        const existeCorreo = await pool.query(
            "SELECT * FROM usuarios WHERE correo = $1",
            [correo]
        );

        if (existeCorreo.rows.length > 0) {
            return res.status(409).json({
                mensaje: "El correo ya se encuentra registrado"
            });
        }

        const usuarioGenerado = generarUsuario(nombre, apellido);
        const claveCifrada = await bcrypt.hash(clave, 10);
        const rolFinal = rol || "cliente";

        const resultado = await pool.query(
            `INSERT INTO usuarios
            (nombre, apellido, telefono, correo, usuario, clave, rol, estado)
            VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)
            RETURNING id_usuario, nombre, apellido, telefono, correo, usuario, rol, estado, fecha_registro`,
            [
                nombre,
                apellido,
                telefono,
                correo,
                usuarioGenerado,
                claveCifrada,
                rolFinal
            ]
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
        const {
            usuario,
            clave
        } = req.body;

        if (!usuario || !clave) {
            return res.status(400).json({
                mensaje: "Usuario y contraseña son obligatorios"
            });
        }

        const resultado = await pool.query(
            `SELECT *
             FROM usuarios
             WHERE usuario = $1 OR correo = $1`,
            [usuario]
        );

        if (resultado.rows.length === 0) {
            return res.status(401).json({
                mensaje: "Credenciales incorrectas"
            });
        }

        const usuarioEncontrado = resultado.rows[0];

        if (usuarioEncontrado.estado === false) {
            return res.status(403).json({
                mensaje: "El usuario se encuentra inactivo"
            });
        }

        const claveValida = await bcrypt.compare(clave, usuarioEncontrado.clave);

        if (!claveValida) {
            return res.status(401).json({
                mensaje: "Credenciales incorrectas"
            });
        }

        res.json({
            mensaje: "Inicio de sesion correcto",
            usuario: {
                id_usuario: usuarioEncontrado.id_usuario,
                nombre: usuarioEncontrado.nombre,
                apellido: usuarioEncontrado.apellido,
                telefono: usuarioEncontrado.telefono,
                correo: usuarioEncontrado.correo,
                usuario: usuarioEncontrado.usuario,
                rol: usuarioEncontrado.rol,
                estado: usuarioEncontrado.estado
            }
        });

    } catch (error) {
        console.error("Error al iniciar sesion:", error);

        res.status(500).json({
            mensaje: "Error al iniciar sesion",
            error: error.message
        });
    }
};

const listarUsuarios = async (req, res) => {
    try {
        const resultado = await pool.query(
            `SELECT id_usuario, nombre, apellido, telefono, correo, usuario, rol, estado, fecha_registro
             FROM usuarios
             ORDER BY fecha_registro DESC`
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

const obtenerUsuarioPorId = async (req, res) => {
    try {
        const { id } = req.params;

        const resultado = await pool.query(
            `SELECT id_usuario, nombre, apellido, telefono, correo, usuario, rol, estado, fecha_registro
             FROM usuarios
             WHERE id_usuario = $1`,
            [id]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                mensaje: "Usuario no encontrado"
            });
        }

        res.json({
            mensaje: "Usuario consultado correctamente",
            usuario: resultado.rows[0]
        });

    } catch (error) {
        console.error("Error al obtener usuario:", error);

        res.status(500).json({
            mensaje: "Error al obtener usuario",
            error: error.message
        });
    }
};

const actualizarUsuario = async (req, res) => {
    try {
        const { id } = req.params;

        const {
            nombre,
            apellido,
            telefono,
            correo
        } = req.body;

        if (!nombre || !apellido || !telefono || !correo) {
            return res.status(400).json({
                mensaje: "Nombre, apellido, teléfono y correo son obligatorios"
            });
        }

        const resultado = await pool.query(
            `UPDATE usuarios
             SET nombre = $1,
                 apellido = $2,
                 telefono = $3,
                 correo = $4
             WHERE id_usuario = $5
             RETURNING id_usuario, nombre, apellido, telefono, correo, usuario, rol, estado, fecha_registro`,
            [
                nombre,
                apellido,
                telefono,
                correo,
                id
            ]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                mensaje: "Usuario no encontrado"
            });
        }

        res.json({
            mensaje: "Usuario actualizado correctamente",
            usuario: resultado.rows[0]
        });

    } catch (error) {
        console.error("Error al actualizar usuario:", error);

        res.status(500).json({
            mensaje: "Error al actualizar usuario",
            error: error.message
        });
    }
};

const solicitarRecuperacion = async (req, res) => {
    const client = await pool.connect();

    try {
        const { correo } = req.body;

        if (!correo) {
            return res.status(400).json({
                mensaje: "El correo es obligatorio"
            });
        }

        const usuarioResultado = await client.query(
            `SELECT id_usuario, nombre, apellido, correo, estado
             FROM usuarios
             WHERE correo = $1`,
            [correo]
        );

        if (usuarioResultado.rows.length === 0) {
            return res.status(404).json({
                mensaje: "No existe un usuario registrado con ese correo"
            });
        }

        const usuario = usuarioResultado.rows[0];

        if (usuario.estado === false) {
            return res.status(403).json({
                mensaje: "El usuario se encuentra inactivo"
            });
        }

        const codigo = generarCodigoRecuperacion();

        const fechaExpiracion = new Date();
        fechaExpiracion.setMinutes(fechaExpiracion.getMinutes() + 15);

        await client.query("BEGIN");

        await client.query(
            `UPDATE recuperacion_claves
             SET usado = TRUE
             WHERE id_usuario = $1
             AND usado = FALSE`,
            [usuario.id_usuario]
        );

        await client.query(
            `INSERT INTO recuperacion_claves
            (id_usuario, correo, codigo, usado, fecha_expiracion)
            VALUES ($1, $2, $3, FALSE, $4)`,
            [
                usuario.id_usuario,
                correo,
                codigo,
                fechaExpiracion
            ]
        );

        await client.query("COMMIT");

        await enviarCorreoRecuperacion(correo, codigo);

        res.json({
            mensaje: "Código de recuperación enviado al correo"
        });

    } catch (error) {
        try {
            await client.query("ROLLBACK");
        } catch (rollbackError) {
            console.error("Error al hacer rollback:", rollbackError.message);
        }

        console.error("Error al solicitar recuperación de clave:", error);

        res.status(500).json({
            mensaje: "Error al solicitar recuperación de clave",
            error: error.message
        });

    } finally {
        client.release();
    }
};

const restablecerClave = async (req, res) => {
    const client = await pool.connect();

    try {
        const {
            correo,
            codigo,
            nueva_clave
        } = req.body;

        if (!correo || !codigo || !nueva_clave) {
            return res.status(400).json({
                mensaje: "Correo, código y nueva contraseña son obligatorios"
            });
        }

        if (nueva_clave.length < 6) {
            return res.status(400).json({
                mensaje: "La nueva contraseña debe tener al menos 6 caracteres"
            });
        }

        const usuarioResultado = await client.query(
            `SELECT id_usuario, correo
             FROM usuarios
             WHERE correo = $1`,
            [correo]
        );

        if (usuarioResultado.rows.length === 0) {
            return res.status(404).json({
                mensaje: "Usuario no encontrado"
            });
        }

        const usuario = usuarioResultado.rows[0];

        const codigoResultado = await client.query(
            `SELECT *
             FROM recuperacion_claves
             WHERE id_usuario = $1
             AND correo = $2
             AND codigo = $3
             AND usado = FALSE
             AND fecha_expiracion > NOW()
             ORDER BY fecha_registro DESC
             LIMIT 1`,
            [
                usuario.id_usuario,
                correo,
                codigo
            ]
        );

        if (codigoResultado.rows.length === 0) {
            return res.status(400).json({
                mensaje: "Código inválido, usado o expirado"
            });
        }

        const nuevaClaveCifrada = await bcrypt.hash(nueva_clave, 10);

        await client.query("BEGIN");

        await client.query(
            `UPDATE usuarios
             SET clave = $1
             WHERE id_usuario = $2`,
            [
                nuevaClaveCifrada,
                usuario.id_usuario
            ]
        );

        await client.query(
            `UPDATE recuperacion_claves
             SET usado = TRUE
             WHERE id_recuperacion = $1`,
            [codigoResultado.rows[0].id_recuperacion]
        );

        await client.query("COMMIT");

        res.json({
            mensaje: "Contraseña actualizada correctamente"
        });

    } catch (error) {
        try {
            await client.query("ROLLBACK");
        } catch (rollbackError) {
            console.error("Error al hacer rollback:", rollbackError.message);
        }

        console.error("Error al restablecer clave:", error);

        res.status(500).json({
            mensaje: "Error al restablecer clave",
            error: error.message
        });

    } finally {
        client.release();
    }
};

module.exports = {
    registrarUsuario,
    loginUsuario,
    listarUsuarios,
    obtenerUsuarioPorId,
    actualizarUsuario,
    solicitarRecuperacion,
    restablecerClave
};