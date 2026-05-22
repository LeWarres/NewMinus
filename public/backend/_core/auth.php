<?php
// public_html/api/_core/auth.php

require_once __DIR__ . "/db.php";

function current_user_id(): int {
    return isset($_SESSION["user_id"]) ? (int)$_SESSION["user_id"] : 0;
}

function require_auth(): int {
    $userId = current_user_id();

    if ($userId <= 0) {
        json_error("No autenticado", 401);
    }

    return $userId;
}

function get_current_user_data(mysqli $conexion): ?array {
    $userId = current_user_id();

    if ($userId <= 0) {
        return null;
    }

    $stmt = $conexion->prepare(
        "SELECT 
            id,
            username,
            email,
            role,
            nacionalidad,
            img_perfil,
            img_banner
         FROM usuarios
         WHERE id = ?
         LIMIT 1"
    );

    $stmt->bind_param("i", $userId);
    $stmt->execute();

    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        return null;
    }

    $user = $result->fetch_assoc();

    return [
        "id" => (int)$user["id"],
        "username" => $user["username"],
        "email" => $user["email"],
        "role" => $user["role"],
        "nacionalidad" => $user["nacionalidad"],
        "imgPerfil" => $user["img_perfil"],
        "imgBanner" => $user["img_banner"]
    ];
}

function require_obra_owner(mysqli $conexion, int $obraId, int $userId): void {
    $stmt = $conexion->prepare(
        "SELECT usuario_id
         FROM obras
         WHERE id = ?
         LIMIT 1"
    );

    $stmt->bind_param("i", $obraId);
    $stmt->execute();

    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        json_error("Obra no encontrada", 404);
    }

    $obra = $result->fetch_assoc();

    if ((int)$obra["usuario_id"] !== $userId) {
        json_error("No tienes permiso para modificar esta obra", 403);
    }
}

function require_capitulo_owner(mysqli $conexion, int $capituloId, int $userId): void {
    $stmt = $conexion->prepare(
        "SELECT o.usuario_id
         FROM capitulos c
         INNER JOIN obras o ON o.id = c.obra_id
         WHERE c.id = ?
         LIMIT 1"
    );

    $stmt->bind_param("i", $capituloId);
    $stmt->execute();

    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        json_error("Capítulo no encontrado", 404);
    }

    $row = $result->fetch_assoc();

    if ((int)$row["usuario_id"] !== $userId) {
        json_error("No tienes permiso para modificar este capítulo", 403);
    }
}

function require_pagina_owner(mysqli $conexion, int $paginaId, int $userId): void {
    $stmt = $conexion->prepare(
        "SELECT o.usuario_id
         FROM capitulo_paginas p
         INNER JOIN capitulos c ON c.id = p.capitulo_id
         INNER JOIN obras o ON o.id = c.obra_id
         WHERE p.id = ?
         LIMIT 1"
    );

    $stmt->bind_param("i", $paginaId);
    $stmt->execute();

    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        json_error("Página no encontrada", 404);
    }

    $row = $result->fetch_assoc();

    if ((int)$row["usuario_id"] !== $userId) {
        json_error("No tienes permiso para modificar esta página", 403);
    }
}