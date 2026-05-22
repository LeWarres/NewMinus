<?php
require_once __DIR__ . "/_core/db.php";

try {
    if ($_SERVER["REQUEST_METHOD"] !== "GET") {
        json_error("Método no permitido", 405);
    }

    $conexion = get_db();

    $token = trim($_GET["token"] ?? "");

    if ($token === "") {
        header("Location: https://minuscreators.com/login?verified=0&reason=missing");
        exit;
    }

    $tokenHash = hash("sha256", $token);

    $stmt = $conexion->prepare(
        "SELECT id
         FROM usuarios
         WHERE email_verification_token_hash = ?
           AND email_verification_expires >= NOW()
           AND email_verificado = 0
         LIMIT 1"
    );

    $stmt->bind_param("s", $tokenHash);
    $stmt->execute();

    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        header("Location: https://minuscreators.com/login?verified=0&reason=invalid");
        exit;
    }

    $user = $result->fetch_assoc();
    $userId = (int)$user["id"];

    $stmtUpdate = $conexion->prepare(
        "UPDATE usuarios
         SET email_verificado = 1,
             email_verification_token_hash = NULL,
             email_verification_expires = NULL
         WHERE id = ?"
    );

    $stmtUpdate->bind_param("i", $userId);
    $stmtUpdate->execute();

    header("Location: https://minuscreators.com/login?verified=1");
    exit;

} catch (Throwable $e) {
    handle_exception($e);
}
?>