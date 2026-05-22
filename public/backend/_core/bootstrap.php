<?php
// public_html/api/_core/bootstrap.php

$config = require __DIR__ . "/config.php";
require_once __DIR__ . "/response.php";

ini_set("display_errors", $config["debug"] ? "1" : "0");
ini_set("log_errors", "1");

header("Content-Type: application/json; charset=UTF-8");
header("X-Content-Type-Options: nosniff");

/*
  CORS con origen exacto.
  Necesario si pruebas desde http://localhost:4200.
*/
$origin = $_SERVER["HTTP_ORIGIN"] ?? "";

if (in_array($origin, $config["allowed_origins"], true)) {
    header("Access-Control-Allow-Origin: " . $origin);
    header("Access-Control-Allow-Credentials: true");
}

header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, X-CSRF-Token");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit;
}

/*
  Seguridad de sesión.
  - HttpOnly: JavaScript no puede leer la cookie.
  - Secure: solo HTTPS.
  - SameSite:
      Lax para producción en minuscreators.com.
      None para localhost, porque localhost -> minuscreators.com es cross-site.
*/
$isLocalDevOrigin = str_starts_with($origin, "http://localhost");

ini_set("session.use_strict_mode", "1");
ini_set("session.use_only_cookies", "1");
ini_set("session.cookie_httponly", "1");

session_name("__Host-minus_session");

session_set_cookie_params([
    "lifetime" => 0,
    "path" => "/",
    "domain" => "",
    "secure" => true,
    "httponly" => true,
    "samesite" => $isLocalDevOrigin ? "None" : "Lax"
]);

session_start();

/*
  Helper global para manejar errores sin exponer detalles internos.
*/
function handle_exception(Throwable $e): void {
    global $config;

    error_log($e->getMessage());

    if (!empty($config["debug"])) {
        json_error("Error interno: " . $e->getMessage(), 500, [
            "linea" => $e->getLine()
        ]);
    }

    json_error("Error interno del servidor", 500);
}