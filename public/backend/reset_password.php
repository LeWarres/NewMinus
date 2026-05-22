<?php
require_once __DIR__ . "/_core/db.php";
require_once __DIR__ . "/_core/csrf.php";
require_once __DIR__ . "/_core/rate_limit.php";

try {
    if ($_SERVER["REQUEST_METHOD"] !== "POST") {
        json_error("Método no permitido", 405);
    }

    require_csrf();

    $conexion = get_db();
    $input = read_json_body();

    $token = trim($input["token"] ?? "");
    $password = $input["password"] ?? "";

    if ($token === "") {
        json_error("Token inválido", 400);
    }

    if (strlen($password) < 8) {
        json_error("La contraseña debe tener mínimo 8 caracteres", 400);
    }

    $ip = get_client_ip();

    check_rate_limit($conexion, $ip, "reset_password_ip", 10, 3600);

    $tokenHash = hash("sha256", $token);

    $stmt = $conexion->prepare(
        "SELECT id
         FROM usuarios
         WHERE password_reset_token_hash = ?
           AND password_reset_expires >= NOW()
           AND email_verificado = 1
         LIMIT 1"
    );

    $stmt->bind_param("s", $tokenHash);
    $stmt->execute();

    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        json_error("El enlace no es válido o ya expiró", 400);
    }

    $user = $result->fetch_assoc();
    $userId = (int)$user["id"];

    $passwordHash = password_hash($password, PASSWORD_DEFAULT);

    $stmtUpdate = $conexion->prepare(
        "UPDATE usuarios
         SET password_hash = ?,
             password_reset_token_hash = NULL,
             password_reset_expires = NULL
         WHERE id = ?"
    );

    $stmtUpdate->bind_param("si", $passwordHash, $userId);
    $stmtUpdate->execute();

    json_success([
        "mensaje" => "Contraseña actualizada correctamente. Ya puedes iniciar sesión."
    ]);

} catch (Throwable $e) {
    handle_exception($e);
}
?>