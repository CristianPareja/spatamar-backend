const nodemailer = require("nodemailer");
const dns = require("dns");

dns.setDefaultResultOrder("ipv4first");

const EMAIL_HOST = process.env.EMAIL_HOST || "smtp.gmail.com";
const EMAIL_PORT = Number(process.env.EMAIL_PORT || 465);
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const EMAIL_FROM = process.env.EMAIL_FROM || `Spa TAMAR <${EMAIL_USER}>`;

const transporter = nodemailer.createTransport({
    host: EMAIL_HOST,
    port: EMAIL_PORT,
    secure: EMAIL_PORT === 465,
    auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS
    },
    family: 4,
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 15000,
    tls: {
        servername: EMAIL_HOST,
        rejectUnauthorized: true
    }
});

const verificarConfiguracionCorreo = async () => {
    try {
        if (!EMAIL_USER || !EMAIL_PASS) {
            console.error("Faltan variables EMAIL_USER o EMAIL_PASS en Render");
            return false;
        }

        await transporter.verify();

        console.log("Configuracion de correo verificada correctamente");
        return true;

    } catch (error) {
        console.error("Error en configuracion de correo:", error.message);
        return false;
    }
};

const enviarCorreoRecuperacion = async (correoDestino, codigo) => {
    try {
        if (!correoDestino || !codigo) {
            throw new Error("Correo destino y codigo son obligatorios");
        }

        const opcionesCorreo = {
            from: EMAIL_FROM,
            to: correoDestino,
            subject: "Codigo de recuperacion de contraseña - Spa TAMAR",
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #d9e6f2; border-radius: 12px; padding: 24px;">
                    <h2 style="color: #0b3d78; text-align: center;">Spa TAMAR</h2>
                    <h3 style="color: #0b3d78;">Recuperación de contraseña</h3>

                    <p>Hola,</p>

                    <p>Has solicitado recuperar tu contraseña en la aplicación móvil de Spa TAMAR.</p>

                    <p>Tu código de recuperación es:</p>

                    <div style="text-align: center; margin: 24px 0;">
                        <span style="font-size: 32px; font-weight: bold; color: #008b8b; letter-spacing: 4px;">
                            ${codigo}
                        </span>
                    </div>

                    <p>Este código tiene una validez limitada. Si no solicitaste este cambio, puedes ignorar este correo.</p>

                    <p style="margin-top: 24px;">Atentamente,<br><strong>Spa TAMAR</strong></p>
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
        console.error("Error al enviar correo de recuperacion:", error.message);
        throw error;
    }
};

module.exports = {
    verificarConfiguracionCorreo,
    enviarCorreoRecuperacion
};