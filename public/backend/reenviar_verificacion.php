<?php
require_once __DIR__ . "/_core/db.php";
require_once __DIR__ . "/_core/csrf.php";
require_once __DIR__ . "/_core/rate_limit.php";
require_once __DIR__ . "/_core/email.php";
require_once __DIR__ . "/_core/turnstile.php";

function seconds_until_available(?string $lastSentAt, int $cooldownSeconds): int {
    if (!$lastSentAt) {
        return 0;
    }

    $lastTime = strtotime($lastSentAt);

    if (!$lastTime) {
        return 0;
    }

    $elapsed = time() - $lastTime;
    $remaining = $cooldownSeconds - $elapsed;

    return max(0, $remaining);
}

try {
    if ($_SERVER["REQUEST_METHOD"] !== "POST") {
        json_error("Método no permitido", 405);
    }

    require_csrf();

    $conexion = get_db();
    $input = read_json_body();

    $email = strtolower(trim($input["email"] ?? ""));
    $turnstileToken = trim($input["turnstileToken"] ?? "");

    if ($email === "") {
        json_error("El correo es obligatorio", 400);
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        json_error("Correo inválido", 400);
    }

    $ip = get_client_ip();

    check_rate_limit($conexion, $ip, "reenviar_verificacion_ip", 5, 3600);
    check_rate_limit($conexion, $email, "reenviar_verificacion_email", 3, 3600);

    require_turnstile($turnstileToken);

    $mensajeGenerico = "Si la cuenta existe y no está verificada, enviaremos un nuevo correo de verificación.";

    $stmt = $conexion->prepare(
        "SELECT 
            id,
            username,
            email,
            email_verificado,
            email_verification_last_sent_at
         FROM usuarios
         WHERE email = ?
         LIMIT 1"
    );

    $stmt->bind_param("s", $email);
    $stmt->execute();

    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        json_success([
            "mensaje" => $mensajeGenerico
        ]);
    }

    $user = $result->fetch_assoc();

    if ((int)$user["email_verificado"] === 1) {
        json_success([
            "mensaje" => "Si la cuenta existe y no está verificada, enviaremos un nuevo correo de verificación."
        ]);
    }

    $cooldownSeconds = 120;
    $remaining = seconds_until_available($user["email_verification_last_sent_at"], $cooldownSeconds);

    if ($remaining > 0) {
        json_error("Espera {$remaining} segundos antes de pedir otro correo de verificación.", 429);
    }

    $token = bin2hex(random_bytes(32));
    $tokenHash = hash("sha256", $token);
    $expires = date("Y-m-d H:i:s", time() + 86400);
    $sentAt = date("Y-m-d H:i:s");

    $conexion->begin_transaction();

    $stmtUpdate = $conexion->prepare(
        "UPDATE usuarios
         SET email_verification_token_hash = ?,
             email_verification_expires = ?,
             email_verification_last_sent_at = ?
         WHERE id = ?"
    );

    $userId = (int)$user["id"];
    $stmtUpdate->bind_param("sssi", $tokenHash, $expires, $sentAt, $userId);
    $stmtUpdate->execute();

    $correoEnviado = send_verification_email_link(
        $user["email"],
        $user["username"],
        $token
    );

    if (!$correoEnviado) {
        throw new Exception("No se pudo enviar el correo de verificación");
    }

    $conexion->commit();

    json_success([
        "mensaje" => "Te enviamos un nuevo correo de verificación."
    ]);

} catch (Throwable $e) {
    if (isset($conexion)) {
        $conexion->rollback();
    }

    handle_exception($e);
}
?>