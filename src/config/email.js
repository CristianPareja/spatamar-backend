const nodemailer = require("nodemailer");
const dns = require("dns");

dns.setDefaultResultOrder("ipv4first");

const EMAIL_HOST = process.env.EMAIL_HOST || "smtp.gmail.com";
const EMAIL_PORT = Number(process.env.EMAIL_PORT || 465);
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const EMAIL_FROM = process.env.EMAIL_FROM || `Spa TAMAR <${EMAIL_USER}>`;

const crearTransporter = () => {
    return nodemailer.createTransport({
        host: EMAIL_HOST,
        port: EMAIL_PORT,
        secure: EMAIL_PORT === 465,
        auth: {
            user: EMAIL_USER,
            pass: EMAIL_PASS
        },
        family: 4,
        connectionTimeout: 20000,
        greetingTimeout: 20000,
        socketTimeout: 20000,
        tls: {
            servername: EMAIL_HOST
        }
    });
};

const verificarConfiguracionCorreo = async () => {
    try {
        if (!EMAIL_USER || !EMAIL_PASS) {
            return {
                ok: false,
                mensaje: "Faltan EMAIL_USER o EMAIL_PASS en las variables de entorno"
            };
        }

        const transporter = crearTransporter();

        await transporter.verify();

        console.log("Configuracion de correo verificada correctamente");

        return {
            ok: true,
            mensaje: "Configuracion de correo verificada correctamente"
        };

    } catch (error) {
        console.error("Error en configuracion de correo:", error);

        return {
            ok: false,
            mensaje: "Error en configuracion de correo",
            error: error.message,
            codigo: error.code || null,
            comando: error.command || null,
            respuesta: error.response || null
        };
    }
};

const enviarCorreoRecuperacion = async (correoDestino, codigo) => {
    try {
        if (!EMAIL_USER || !EMAIL_PASS) {
            throw new Error("Faltan EMAIL_USER o EMAIL_PASS en las variables de entorno");
        }

        if (!correoDestino || !codigo) {
            throw new Error("Correo destino y codigo son obligatorios");
        }

        const transporter = crearTransporter();

        const opcionesCorreo = {
            from: EMAIL_FROM,
            to: correoDestino,
            subject: "Código de recuperación de contraseña - Spa TAMAR",
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #d9e6f2; border-radius: 12px; padding: 24px;">
                    <h2 style="color: #0b3d78; text-align: center;">Spa TAMAR</h2>
                    <h3 style="color: #0b3d78;">Recuperación de contraseña</h3>

                    <p>Has solicitado recuperar tu contraseña en la aplicación móvil de Spa TAMAR.</p>

                    <p>Tu código de recuperación es:</p>

                    <div style="text-align: center; margin: 24px 0;">
                        <span style="font-size: 34px; font-weight: bold; color: #008b8b; letter-spacing: 4px;">
                            ${codigo}
                        </span>
                    </div>

                    <p>Este código tiene una validez de 15 minutos.</p>

                    <p>Si no solicitaste este cambio, puedes ignorar este correo.</p>

                    <p style="margin-top: 24px;">
                        Atentamente,<br>
                        <strong>Spa TAMAR</strong>
                    </p>
                </div>
            `
        };

        const info = await transporter.sendMail(opcionesCorreo);

        console.log("Correo de recuperacion enviado correctamente:", info.messageId);

        return {
            enviado: true,
            messageId: info.messageId
        };

    } catch (error) {
        console.error("Error al enviar correo de recuperacion:", error);

        throw error;
    }
};

module.exports = {
    verificarConfiguracionCorreo,
    enviarCorreoRecuperacion
};