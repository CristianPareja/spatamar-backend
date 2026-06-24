const nodemailer = require("nodemailer");
require("dotenv").config();

const crearTransporter = () => {
    return nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: Number(process.env.EMAIL_PORT || 587),
        secure: false,
        family: 4,
        requireTLS: true,
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 10000,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        },
        tls: {
            rejectUnauthorized: false
        }
    });
};

const enviarCorreoRecuperacion = async (correoDestino, codigo) => {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.log("Código de recuperación generado:", codigo);
        console.log("No se configuró EMAIL_USER o EMAIL_PASS en .env");
        return;
    }

    const transporter = crearTransporter();

    await transporter.sendMail({
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: correoDestino,
        subject: "Recuperación de contraseña - Spa TAMAR",
        html: `
            <h2>Recuperación de contraseña</h2>
            <p>Se solicitó recuperar la contraseña de tu cuenta en Spa TAMAR.</p>
            <p>Tu código de recuperación es:</p>
            <h1 style="letter-spacing: 4px;">${codigo}</h1>
            <p>Este código vence en 15 minutos.</p>
            <p>Si no solicitaste este cambio, puedes ignorar este mensaje.</p>
        `
    });
};

module.exports = {
    enviarCorreoRecuperacion
};