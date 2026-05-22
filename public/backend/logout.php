<?php
require_once __DIR__ . "/_core/csrf.php";

try {
    if ($_SERVER["REQUEST_METHOD"] !== "POST") {
        json_error("Método no permitido", 405);
    }

    require_csrf();

    $_SESSION = [];

    if (ini_get("session.use_cookies")) {
        $params = session_get_cookie_params();

        setcookie(
            session_name(),
            "",
            time() - 42000,
            $params["path"],
            $params["domain"],
            $params["secure"],
            $params["httponly"]
        );
    }

    session_destroy();

    json_success([
        "mensaje" => "Sesión cerrada correctamente"
    ]);

} catch (Throwable $e) {
    handle_exception($e);
}
?>