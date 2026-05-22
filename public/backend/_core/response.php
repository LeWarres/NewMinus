<?php
// public_html/api/_core/response.php

function json_response(array $data, int $statusCode = 200): void {
    http_response_code($statusCode);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function json_success(array $data = []): void {
    json_response(array_merge([
        "success" => true
    ], $data));
}

function json_error(string $message, int $statusCode = 400, array $extra = []): void {
    json_response(array_merge([
        "success" => false,
        "error" => $message
    ], $extra), $statusCode);
}

function read_json_body(): array {
    $raw = file_get_contents("php://input");

    if (!$raw) {
        return [];
    }

    $data = json_decode($raw, true);

    if (!is_array($data)) {
        return [];
    }

    return $data;
}