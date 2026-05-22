<?php
require_once __DIR__ . "/_core/auth.php";
require_once __DIR__ . "/_core/csrf.php";

function obtenerIdiomasLecturaMe(mysqli $conexion, int $userId): array {
    if ($userId <= 0) {
        return [];
    }

    $stmt = $conexion->prepare(
        "SELECT idioma
         FROM usuario_idiomas_lectura
         WHERE usuario_id = ?
         ORDER BY idioma ASC"
    );

    $stmt->bind_param("i", $userId);
    $stmt->execute();

    $result = $stmt->get_result();

    $idiomas = [];

    while ($row = $result->fetch_assoc()) {
        $idioma = strtoupper(trim($row["idioma"] ?? ""));

        if ($idioma === "") {
            continue;
        }

        if (!in_array($idioma, $idiomas, true)) {
            $idiomas[] = $idioma;
        }
    }

    return $idiomas;
}

try {
    $conexion = get_db();
    $user = get_current_user_data($conexion);

    if ($user !== null) {
        $userId = intval($user["id"] ?? 0);
        $idiomasLectura = obtenerIdiomasLecturaMe($conexion, $userId);

        if (count($idiomasLectura) === 0) {
            $idiomasLectura[] = "EN";
        }

        $user["idiomasLectura"] = $idiomasLectura;
    }

    json_success([
        "authenticated" => $user !== null,
        "user" => $user,
        "csrfToken" => csrf_token()
    ]);
} catch (Throwable $e) {
    handle_exception($e);
}
?>