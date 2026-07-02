const nodemailer = require("nodemailer");
const dns = require("dns");
require("dotenv").config();

// Forzar prioridad IPv4 para evitar error ENETUNREACH con IPv6 en Render
dns.setDefaultResultOrder("ipv4first");

const crearTransporter = () => {
    const emailHost = process.env.EMAIL_HOST || "smtp.gmail.com";
    const emailPort = Number(process.env.EMAIL_PORT || 587);
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS
        ? process.env.EMAIL_PASS.replace(/\s/g, "")
        : "";

    return nodemailer.createTransport({
        host: emailHost,
        port: emailPort,
        secure: emailPort === 465,
        requireTLS: emailPort === 587,
        family: 4,
        auth: {
            user: emailUser,
            pass: emailPass
        },
        tls: {
            rejectUnauthorized: false
        }
    });
};

const verificarConfiguracionCorreo = async () => {
    try {
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            console.log("Correo no configurado: faltan EMAIL_USER o EMAIL_PASS en .env");
            return false;
        }

        const transporter = crearTransporter();

        await transporter.verify();

        console.log("Servidor de correo configurado correctamente");
        return true;

    } catch (error) {
        console.error("Error al verificar configuración de correo:");
        console.error(error.message);
        return false;
    }
};

const enviarCorreoRecuperacion = async (correoDestino, codigo) => {
    try {
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            console.log("Código de recuperación generado:", codigo);
            console.log("No se configuró EMAIL_USER o EMAIL_PASS en .env");
            return;
        }

        const transporter = crearTransporter();

        const resultado = await transporter.sendMail({
            from: process.env.EMAIL_FROM || `"Spa TAMAR" <${process.env.EMAIL_USER}>`,
            to: correoDestino,
            subject: "Recuperación de contraseña - Spa TAMAR",
            html: `
                <div style="font-family: Arial, sans-serif; color: #333;">
                    <h2>Recuperación de contraseña</h2>
                    <p>Se solicitó recuperar la contraseña de tu cuenta en Spa TAMAR.</p>
                    <p>Tu código de recuperación es:</p>
                    <h1 style="letter-spacing: 4px; color: #7B2CBF;">${codigo}</h1>
                    <p>Este código vence en 15 minutos.</p>
                    <p>Si no solicitaste este cambio, puedes ignorar este mensaje.</p>
                </div>
            `
        });

        console.log("Correo de recuperación enviado a:", correoDestino);
        console.log("ID del mensaje:", resultado.messageId);

    } catch (error) {
        console.error("Error al enviar correo de recuperación:");
        console.error(error.message);
        throw error;
    }
};

module.exports = {
    enviarCorreoRecuperacion,
    verificarConfiguracionCorreo
};