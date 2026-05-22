<?php
require_once __DIR__ . "/_core/auth.php";
require_once __DIR__ . "/_core/csrf.php";

function borrarArchivoPublicoSeguro(?string $rutaPublica): void {
    if (!$rutaPublica) {
        return;
    }

    if (preg_match('/^https?:\/\//i', $rutaPublica)) {
        return;
    }

    $rutaLimpia = ltrim($rutaPublica, "/");

    /*
      Solo borrar archivos dentro de uploads/.
      Esto protege imágenes default como:
      obras/paleta/portada.png
      obras/paleta/tres.png
    */
    if (strpos($rutaLimpia, "uploads/") !== 0) {
        return;
    }

    $baseUploads = realpath(__DIR__ . "/../uploads");
    $archivo = realpath(__DIR__ . "/../" . $rutaLimpia);

    if (
        $baseUploads &&
        $archivo &&
        strpos($archivo, $baseUploads) === 0 &&
        is_file($archivo)
    ) {
        unlink($archivo);
    }
}

function tablaExiste(mysqli $conexion, string $tabla): bool {
    $stmt = $conexion->prepare(
        "SELECT COUNT(*) AS total
         FROM information_schema.TABLES
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = ?"
    );

    $stmt->bind_param("s", $tabla);
    $stmt->execute();

    $result = $stmt->get_result();
    $row = $result->fetch_assoc();

    return ((int)$row["total"]) > 0;
}

function eliminarPorObraSiTablaExiste(mysqli $conexion, string $tabla, int $obraId): void {
    $tablasPermitidas = [
        "obra_vistas",
        "capitulo_vistas",
        "favoritos"
    ];

    if (!in_array($tabla, $tablasPermitidas, true)) {
        return;
    }

    if (!tablaExiste($conexion, $tabla)) {
        return;
    }

    $sql = "DELETE FROM {$tabla} WHERE obra_id = ?";
    $stmt = $conexion->prepare($sql);
    $stmt->bind_param("i", $obraId);
    $stmt->execute();
}

try {
    if ($_SERVER["REQUEST_METHOD"] !== "POST") {
        json_error("Método no permitido", 405);
    }

    require_csrf();

    $conexion = get_db();
    $usuarioId = require_auth();

    $input = read_json_body();

    $obraId = intval($input["obra_id"] ?? 0);

    if ($obraId <= 0) {
        json_error("Falta el id de la obra", 400);
    }

    require_obra_owner($conexion, $obraId, $usuarioId);

    /*
      Primero obtenemos portada y páginas para borrar archivos físicos
      después de confirmar que la BD se eliminó correctamente.
    */
    $stmtObra = $conexion->prepare(
        "SELECT portada
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

    $obra = $resultObra->fetch_assoc();

    $archivosABorrar = [];

    if (!empty($obra["portada"])) {
        $archivosABorrar[] = $obra["portada"];
    }

    $stmtPaginas = $conexion->prepare(
        "SELECT p.imagen
         FROM capitulo_paginas p
         INNER JOIN capitulos c ON c.id = p.capitulo_id
         WHERE c.obra_id = ?"
    );

    $stmtPaginas->bind_param("i", $obraId);
    $stmtPaginas->execute();

    $resultPaginas = $stmtPaginas->get_result();

    while ($pagina = $resultPaginas->fetch_assoc()) {
        if (!empty($pagina["imagen"])) {
            $archivosABorrar[] = $pagina["imagen"];
        }
    }

    $conexion->begin_transaction();

    /*
      Borrar relaciones auxiliares si existen.
      Así evitamos errores si todavía no tienes alguna tabla.
    */
    eliminarPorObraSiTablaExiste($conexion, "obra_vistas", $obraId);
    eliminarPorObraSiTablaExiste($conexion, "capitulo_vistas", $obraId);
    eliminarPorObraSiTablaExiste($conexion, "favoritos", $obraId);

    /*
      Borrar páginas de todos los capítulos.
    */
    $stmtDeletePaginas = $conexion->prepare(
        "DELETE p
         FROM capitulo_paginas p
         INNER JOIN capitulos c ON c.id = p.capitulo_id
         WHERE c.obra_id = ?"
    );

    $stmtDeletePaginas->bind_param("i", $obraId);
    $stmtDeletePaginas->execute();

    /*
      Borrar capítulos.
    */
    $stmtDeleteCapitulos = $conexion->prepare(
        "DELETE FROM capitulos
         WHERE obra_id = ?"
    );

    $stmtDeleteCapitulos->bind_param("i", $obraId);
    $stmtDeleteCapitulos->execute();

    /*
      Borrar obra.
    */
    $stmtDeleteObra = $conexion->prepare(
        "DELETE FROM obras
         WHERE id = ? AND usuario_id = ?"
    );

    $stmtDeleteObra->bind_param("ii", $obraId, $usuarioId);
    $stmtDeleteObra->execute();

    if ($stmtDeleteObra->affected_rows !== 1) {
        throw new Exception("No se pudo eliminar la obra");
    }

    $conexion->commit();

    /*
      Después del commit borramos archivos físicos.
      Si un archivo no existe, simplemente se ignora.
    */
    foreach ($archivosABorrar as $archivo) {
        borrarArchivoPublicoSeguro($archivo);
    }

    json_success([
        "mensaje" => "Obra eliminada correctamente",
        "obra_id" => $obraId
    ]);

} catch (Throwable $e) {
    if (isset($conexion)) {
        $conexion->rollback();
    }

    handle_exception($e);
}
?>