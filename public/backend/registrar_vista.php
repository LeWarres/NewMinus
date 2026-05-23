<?php
require_once __DIR__ . "/_core/auth.php";
require_once __DIR__ . "/_core/rate_limit.php";

try {
    if ($_SERVER["REQUEST_METHOD"] !== "POST") {
        json_error("Método no permitido", 405);
    }

    $conexion = get_db();

    $userId = current_user_id();
    $userIdNullable = $userId > 0 ? $userId : null;

    $input = read_json_body();

    $obraId = intval($input["obra_id"] ?? 0);
    $capituloId = intval($input["capitulo_id"] ?? 0);
    $capituloVersionId = intval($input["capitulo_version_id"] ?? 0);

    if ($obraId <= 0) {
        json_error("Falta el id de la obra", 400);
    }

    $stmtObra = $conexion->prepare(
        "SELECT id
         FROM obras
         WHERE id = ?
         LIMIT 1"
    );

    $stmtObra->bind_param("i", $obraId);
    $stmtObra->execute();

    $resultObra = $stmtObra->get_result();

    if ($resultObra->num_rows === 0) {
        json_error("Obra no encontrada", 404);
    }

    if ($capituloVersionId > 0) {
        $stmtVersion = $conexion->prepare(
            "SELECT cv.id, cv.capitulo_id
             FROM capitulo_versiones cv
             INNER JOIN capitulos c ON c.id = cv.capitulo_id
             WHERE cv.id = ?
               AND c.obra_id = ?
             LIMIT 1"
        );

        $stmtVersion->bind_param("ii", $capituloVersionId, $obraId);
        $stmtVersion->execute();
        $resultVersion = $stmtVersion->get_result();

        if ($resultVersion->num_rows > 0) {
            $version = $resultVersion->fetch_assoc();
            $capituloId = (int)$version["capitulo_id"];
        } else {
            $capituloVersionId = 0;
        }
    }

    if ($capituloId > 0) {
        $stmtCapitulo = $conexion->prepare(
            "SELECT id
             FROM capitulos
             WHERE id = ?
               AND obra_id = ?
             LIMIT 1"
        );

        $stmtCapitulo->bind_param("ii", $capituloId, $obraId);
        $stmtCapitulo->execute();
        $resultCapitulo = $stmtCapitulo->get_result();

        if ($resultCapitulo->num_rows === 0) {
            $capituloId = 0;
            $capituloVersionId = 0;
        }
    }

    $ip = get_client_ip();

    check_rate_limit($conexion, $ip, "registrar_vista_ip", 120, 3600);

    if ($userId > 0) {
        $stmtExiste = $conexion->prepare(
            "SELECT id
             FROM obra_vistas
             WHERE obra_id = ?
               AND user_id = ?
               AND created_at >= DATE_SUB(NOW(), INTERVAL 12 HOUR)
             LIMIT 1"
        );

        $stmtExiste->bind_param("ii", $obraId, $userId);
    } else {
        $stmtExiste = $conexion->prepare(
            "SELECT id
             FROM obra_vistas
             WHERE obra_id = ?
               AND ip = ?
               AND created_at >= DATE_SUB(NOW(), INTERVAL 12 HOUR)
             LIMIT 1"
        );

        $stmtExiste->bind_param("is", $obraId, $ip);
    }

    $stmtExiste->execute();
    $resultExiste = $stmtExiste->get_result();

    if ($resultExiste->num_rows > 0) {
        json_success([
            "mensaje" => "Vista ya registrada recientemente",
            "contada" => false
        ]);
    }

    $conexion->begin_transaction();

    $stmtInsert = $conexion->prepare(
        "INSERT INTO obra_vistas
         (obra_id, user_id, ip, created_at)
         VALUES (?, ?, ?, NOW())"
    );

    $stmtInsert->bind_param(
        "iis",
        $obraId,
        $userIdNullable,
        $ip
    );

    $stmtInsert->execute();

    $stmtUpdate = $conexion->prepare(
        "UPDATE obras
         SET num_visitas = num_visitas + 1
         WHERE id = ?"
    );

    $stmtUpdate->bind_param("i", $obraId);
    $stmtUpdate->execute();

    if ($capituloId > 0) {
        $stmtCapituloUpdate = $conexion->prepare(
            "UPDATE capitulos
             SET num_visitas = num_visitas + 1
             WHERE id = ?"
        );

        $stmtCapituloUpdate->bind_param("i", $capituloId);
        $stmtCapituloUpdate->execute();
    }

    if ($capituloVersionId > 0) {
        $stmtVersionUpdate = $conexion->prepare(
            "UPDATE capitulo_versiones
             SET num_visitas = num_visitas + 1
             WHERE id = ?"
        );

        $stmtVersionUpdate->bind_param("i", $capituloVersionId);
        $stmtVersionUpdate->execute();
    }

    $conexion->commit();

    json_success([
        "mensaje" => "Vista registrada",
        "contada" => true
    ]);

} catch (Throwable $e) {
    if (isset($conexion)) {
        $conexion->rollback();
    }

    handle_exception($e);
}
?>
