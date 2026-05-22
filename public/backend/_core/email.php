<?php
// public_html/api/_core/email.php

function send_plain_email(string $to, string $subject, string $message): bool {
    $headers = [];
    $headers[] = "From: Minus Creators <noreply@minuscreators.com>";
    $headers[] = "Reply-To: noreply@minuscreators.com";
    $headers[] = "Content-Type: text/plain; charset=UTF-8";
    $headers[] = "X-Mailer: PHP/" . phpversion();

    return mail($to, $subject, $message, implode("\r\n", $headers));
}

function send_verification_email_link(string $email, string $username, string $token): bool {
    $verifyUrl = "https://minuscreators.com/api/verificar_email.php?token=" . urlencode($token);

    $subject = "Verifica tu cuenta en Minus Creators";

    $message = "
Hola {$username},

Gracias por registrarte en Minus Creators.

Para activar tu cuenta, abre este enlace:

{$verifyUrl}

Este enlace expira en 24 horas.

Si tú no creaste esta cuenta, puedes ignorar este correo.

Minus Creators
";

    return send_plain_email($email, $subject, $message);
}

function send_password_reset_email_link(string $email, string $username, string $token): bool {
    /*
      Esta ruta será una página Angular que haremos después:
      /reset-password?token=...
    */
    $resetUrl = "https://minuscreators.com/reset-password?token=" . urlencode($token);

    $subject = "Restablece tu contraseña en Minus Creators";

    $message = "
Hola {$username},

Recibimos una solicitud para restablecer la contraseña de tu cuenta.

Para crear una nueva contraseña, abre este enlace:

{$resetUrl}

Este enlace expira en 1 hora.

Si tú no solicitaste este cambio, puedes ignorar este correo.

Minus Creators
";

    return send_plain_email($email, $subject, $message);
}