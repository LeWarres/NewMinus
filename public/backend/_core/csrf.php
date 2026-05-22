<?php
// public_html/api/_core/csrf.php

require_once __DIR__ . "/bootstrap.php";

function csrf_token(): string {
    if (empty($_SESSION["csrf_token"])) {
        $_SESSION["csrf_token"] = bin2hex(random_bytes(32));
    }

    return $_SESSION["csrf_token"];
}

function require_csrf(): void {
    $method = $_SERVER["REQUEST_METHOD"] ?? "GET";

    if ($method !== "POST") {
        return;
    }

    $headerToken = $_SERVER["HTTP_X_CSRF_TOKEN"] ?? "";

    if (empty($_SESSION["csrf_token"]) || !hash_equals($_SESSION["csrf_token"], $headerToken)) {
        json_error("Token CSRF inválido", 403);
    }
}