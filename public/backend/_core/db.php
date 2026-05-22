<?php
// public_html/api/_core/db.php

require_once __DIR__ . "/bootstrap.php";

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

function get_db(): mysqli {
    static $conexion = null;

    if ($conexion instanceof mysqli) {
        return $conexion;
    }

    global $config;

    $db = $config["database"];

    $conexion = new mysqli(
        $db["host"],
        $db["user"],
        $db["password"],
        $db["name"]
    );

    $conexion->set_charset("utf8mb4");

    return $conexion;
}