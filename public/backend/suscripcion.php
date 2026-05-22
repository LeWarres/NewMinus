<?php
require_once __DIR__ . "/_core/auth.php";
require_once __DIR__ . "/_core/csrf.php";
require_once __DIR__ . "/_core/rate_limit.php";

try {
    if ($_SERVER["REQUEST_METHOD"] !== "POST") {
        json_error("Método no permitido", 405);
    }

    require_csrf();

    $conexion = get_db();
    $seguidorId = require_auth();

    check_rate_limit($conexion, (string)$seguidorId, "suscripcion", 60, 3600);

    $input = read_json_body();

    $seguidoId = intval($input["seguido_id"] ?? 0);

    if ($seguidoId <= 0) {
        json_error("Falta el usuario a seguir", 400);
    }

    if ($seguidorId === $seguidoId) {
        json_error("No puedes suscribirte a tu propio perfil", 400);
    }

    /*
      Verificar que el usuario a seguir exista.
    */
    $stmtUser = $conexion->prepare(
        "SELECT id
         FROM usuarios
         WHERE id = ?
         LIMIT 1"
    );

    $stmtUser->bind_param("i", $seguidoId);
    $stmtUser->execute();

    $resultUser = $stmtUser->get_result();

    if ($resultUser->num_rows === 0) {
        json_error("Usuario no encontrado", 404);
    }

    /*
      Ver si ya existe la suscripción.
    */
    $stmtExiste = $conexion->prepare(
        "SELECT id
         FROM suscripciones
         WHERE seguidor_id = ? AND seguido_id = ?
         LIMIT 1"
    );

    $stmtExiste->bind_param("ii", $seguidorId, $seguidoId);
    $stmtExiste->execute();

    $resultExiste = $stmtExiste->get_result();

    if ($resultExiste->num_rows > 0) {
        $suscripcion = $resultExiste->fetch_assoc();
        $suscripcionId = (int)$suscripcion["id"];

        $stmtDelete = $conexion->prepare(
            "DELETE FROM suscripciones
             WHERE id = ?"
        );

        $stmtDelete->bind_param("i", $suscripcionId);
        $stmtDelete->execute();

        json_success([
            "suscrito" => false,
            "mensaje" => "Te has desuscrito correctamente"
        ]);
    }

    $stmtInsert = $conexion->prepare(
        "INSERT INTO suscripciones
         (seguidor_id, seguido_id)
         VALUES (?, ?)"
    );

    $stmtInsert->bind_param("ii", $seguidorId, $seguidoId);
    $stmtInsert->execute();

    json_success([
        "suscrito" => true,
        "mensaje" => "Te has suscrito correctamente"
    ]);

} catch (Throwable $e) {
    handle_exception($e);
}
?>