<?php
require_once __DIR__ . "/_core/csrf.php";

try {
    json_success([
        "csrfToken" => csrf_token()
    ]);
} catch (Throwable $e) {
    handle_exception($e);
}