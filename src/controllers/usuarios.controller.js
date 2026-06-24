const pool = require("../config/db");
const bcrypt = require("bcryptjs");

const {
    enviarCorreoRecuperacion
} = require("../config/email");

const listarUsuarios = async (req, res) => {
    try {
        const resultado = await pool.query(
            `SELECT 
                id_usuario,
                nombre,
                apellido,
                telefono,
                correo,
                usuario,
                rol,
                estado,
                fecha_registro
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

const registrarUsuario = async (req, res) => {
    try {
        const {
            nombre,
            apellido,
            telefono,
            correo,
            usuario,
            clave,
            rol
        } = req.body;

        if (!nombre || !apellido || !telefono || !correo || !usuario || !clave) {
            return res.status(400).json({
                mensaje: "Todos los campos obligatorios deben ser enviados"
            });
        }

        if (clave.length < 4) {
            return res.status(400).json({
                mensaje: "La clave debe tener al menos 4 caracteres"
            });
        }

        const usuarioExistente = await pool.query(
            `SELECT * FROM usuarios
             WHERE correo = $1 OR usuario = $2`,
            [
                correo,
                usuario
            ]
        );

        if (usuarioExistente.rows.length > 0) {
            return res.status(409).json({
                mensaje: "El correo o usuario ya se encuentra registrado"
            });
        }

        const salt = await bcrypt.genSalt(10);
        const claveHash = await bcrypt.hash(clave, salt);

        const resultado = await pool.query(
            `INSERT INTO usuarios
            (nombre, apellido, telefono, correo, usuario, clave, rol, estado)
            VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)
            RETURNING 
                id_usuario,
                nombre,
                apellido,
                telefono,
                correo,
                usuario,
                rol,
                estado,
                fecha_registro`,
            [
                nombre,
                apellido,
                telefono,
                correo,
                usuario,
                claveHash,
                rol || "cliente"
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
            usuarioOCorreo,
            clave
        } = req.body;

        if (!usuarioOCorreo || !clave) {
            return res.status(400).json({
                mensaje: "Usuario/correo y clave son obligatorios"
            });
        }

        const resultado = await pool.query(
            `SELECT * FROM usuarios
             WHERE usuario = $1 OR correo = $1`,
            [
                usuarioOCorreo
            ]
        );

        if (resultado.rows.length === 0) {
            return res.status(401).json({
                mensaje: "Credenciales incorrectas"
            });
        }

        const usuarioEncontrado = resultado.rows[0];

        if (!usuarioEncontrado.estado) {
            return res.status(403).json({
                mensaje: "El usuario se encuentra inactivo"
            });
        }

        let claveCorrecta = false;

        if (usuarioEncontrado.clave.startsWith("$2a$") ||
            usuarioEncontrado.clave.startsWith("$2b$") ||
            usuarioEncontrado.clave.startsWith("$2y$")) {

            claveCorrecta = await bcrypt.compare(clave, usuarioEncontrado.clave);

        } else {
            claveCorrecta = clave === usuarioEncontrado.clave;

            if (claveCorrecta) {
                const salt = await bcrypt.genSalt(10);
                const claveHash = await bcrypt.hash(clave, salt);

                await pool.query(
                    `UPDATE usuarios
                     SET clave = $1
                     WHERE id_usuario = $2`,
                    [
                        claveHash,
                        usuarioEncontrado.id_usuario
                    ]
                );
            }
        }

        if (!claveCorrecta) {
            return res.status(401).json({
                mensaje: "Credenciales incorrectas"
            });
        }

        res.json({
            mensaje: "Inicio de sesión correcto",
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
        console.error("Error al iniciar sesión:", error);

        res.status(500).json({
            mensaje: "Error al iniciar sesión",
            error: error.message
        });
    }
};

const generarCodigoRecuperacion = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

const solicitarRecuperacionClave = async (req, res) => {
    try {
        const { correo } = req.body;

        if (!correo) {
            return res.status(400).json({
                mensaje: "El correo es obligatorio"
            });
        }

        const usuarioResultado = await pool.query(
            `SELECT * FROM usuarios
             WHERE correo = $1
             AND estado = TRUE`,
            [correo]
        );

        if (usuarioResultado.rows.length === 0) {
            return res.json({
                mensaje: "Si el correo se encuentra registrado, se enviará un código de recuperación"
            });
        }

        const usuario = usuarioResultado.rows[0];
        const codigo = generarCodigoRecuperacion();

        const fechaExpiracion = await pool.query(
            `SELECT NOW() + INTERVAL '15 minutes' AS fecha_expiracion`
        );

        await pool.query(
            `UPDATE recuperacion_claves
             SET usado = TRUE
             WHERE id_usuario = $1
             AND usado = FALSE`,
            [usuario.id_usuario]
        );

        await pool.query(
            `INSERT INTO recuperacion_claves
            (id_usuario, correo, codigo, usado, fecha_expiracion)
            VALUES ($1, $2, $3, FALSE, $4)`,
            [
                usuario.id_usuario,
                correo,
                codigo,
                fechaExpiracion.rows[0].fecha_expiracion
            ]
        );

        await enviarCorreoRecuperacion(correo, codigo);

        res.json({
            mensaje: "Si el correo se encuentra registrado, se enviará un código de recuperación"
        });

    } catch (error) {
        console.error("Error al solicitar recuperación de clave:", error);

        res.status(500).json({
            mensaje: "Error al solicitar recuperación de clave",
            error: error.message
        });
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
                mensaje: "Correo, código y nueva clave son obligatorios"
            });
        }

        if (nueva_clave.length < 4) {
            return res.status(400).json({
                mensaje: "La nueva clave debe tener al menos 4 caracteres"
            });
        }

        await client.query("BEGIN");

        const recuperacionResultado = await client.query(
            `SELECT rc.*, u.id_usuario
             FROM recuperacion_claves rc
             INNER JOIN usuarios u ON rc.id_usuario = u.id_usuario
             WHERE rc.correo = $1
             AND rc.codigo = $2
             AND rc.usado = FALSE
             AND rc.fecha_expiracion > NOW()
             AND u.estado = TRUE
             ORDER BY rc.fecha_registro DESC
             LIMIT 1`,
            [
                correo,
                codigo
            ]
        );

        if (recuperacionResultado.rows.length === 0) {
            await client.query("ROLLBACK");

            return res.status(400).json({
                mensaje: "Código inválido o expirado"
            });
        }

        const recuperacion = recuperacionResultado.rows[0];

        const salt = await bcrypt.genSalt(10);
        const claveHash = await bcrypt.hash(nueva_clave, salt);

        await client.query(
            `UPDATE usuarios
             SET clave = $1
             WHERE id_usuario = $2`,
            [
                claveHash,
                recuperacion.id_usuario
            ]
        );

        await client.query(
            `UPDATE recuperacion_claves
             SET usado = TRUE
             WHERE id_recuperacion = $1`,
            [
                recuperacion.id_recuperacion
            ]
        );

        await client.query("COMMIT");

        res.json({
            mensaje: "Clave restablecida correctamente"
        });

    } catch (error) {
        await client.query("ROLLBACK");

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
    listarUsuarios,
    registrarUsuario,
    loginUsuario,
    solicitarRecuperacionClave,
    restablecerClave
};