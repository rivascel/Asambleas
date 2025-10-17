const { Resend } = require('resend');
const { config } = require('../config/config');

const resend = new Resend(config.api_key); // Guárdala en .env

async function sendMagicLink(to, token) {
  const magicLink = `${config.FrontEndBaseUrl}/magic-link?token=${token}`;

  try {
    const data = await resend.emails.send({
      from: 'onboarding@resend.dev', // O tu correo verificado
      to,
      subject: 'Tu enlace mágico de acceso',
      html: `
        <p>Hola 👋</p>
        <p>Haz clic en el siguiente enlace para iniciar sesión:</p>
        <a href="${magicLink}">${magicLink}</a>
        <p>Este enlace expira en 15 minutos.</p>
      `,
    });

    console.log('Correo enviado:', data);

    return { success: true };
  } catch (error) {
    console.error('Error al enviar el correo:', error);
    return { success: false };
  }
}

module.exports = sendMagicLink;