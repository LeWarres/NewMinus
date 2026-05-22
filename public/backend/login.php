<?php
require_once __DIR__ . "/_core/db.php";
require_once __DIR__ . "/_core/csrf.php";
require_once __DIR__ . "/_core/rate_limit.php";

try {
    if ($_SERVER["REQUEST_METHOD"] !== "POST") {
        json_error("Método no permitido", 405);
    }

    $conexion = get_db();
    $input = read_json_body();

    $email = strtolower(trim($input["email"] ?? ""));
    $password = $input["password"] ?? "";

    if ($email === "" || $password === "") {
        json_error("Correo y contraseña son obligatorios", 400);
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        json_error("Correo inválido", 400);
    }

    /*
      Protección contra fuerza bruta.
    */
    $ip = get_client_ip();

    check_rate_limit($conexion, $ip, "login_ip", 10, 900);
    check_rate_limit($conexion, $email, "login_email", 5, 900);

    $stmt = $conexion->prepare(
        "SELECT
            id,
            username,
            email,
            password_hash,
            role,
            nacionalidad,
            img_perfil,
            img_banner,
            twitter,
            facebook,
            instagram,
            email_verificado
         FROM usuarios
         WHERE email = ?
         LIMIT 1"
    );

    $stmt->bind_param("s", $email);
    $stmt->execute();

    $result = $stmt->get_result();

    /*
      Mismo mensaje para evitar revelar si el correo existe.
    */
    if ($result->num_rows === 0) {
        json_error("Credenciales incorrectas", 401);
    }

    $user = $result->fetch_assoc();

    if (empty($user["password_hash"])) {
        json_error("Credenciales incorrectas", 401);
    }

    if (!password_verify($password, $user["password_hash"])) {
        json_error("Credenciales incorrectas", 401);
    }

    if ((int)$user["email_verificado"] !== 1) {
        json_error("Debes verificar tu correo antes de iniciar sesión", 403, [
            "requiresVerification" => true
        ]);
    }

    if (password_needs_rehash($user["password_hash"], PASSWORD_DEFAULT)) {
        $newHash = password_hash($password, PASSWORD_DEFAULT);

        $stmtUpdate = $conexion->prepare(
            "UPDATE usuarios
             SET password_hash = ?
             WHERE id = ?"
        );

        $userId = (int)$user["id"];
        $stmtUpdate->bind_param("si", $newHash, $userId);
        $stmtUpdate->execute();
    }

    session_regenerate_id(true);

    $_SESSION["user_id"] = (int)$user["id"];
    $_SESSION["csrf_token"] = bin2hex(random_bytes(32));

    json_success([
        "authenticated" => true,
        "csrfToken" => $_SESSION["csrf_token"],
        "user" => [
            "id" => (int)$user["id"],
            "username" => $user["username"],
            "email" => $user["email"],
            "role" => $user["role"],
            "nacionalidad" => $user["nacionalidad"],
            "imgPerfil" => $user["img_perfil"],
            "imgBanner" => $user["img_banner"],
            "twitter" => $user["twitter"],
            "facebook" => $user["facebook"],
            "instagram" => $user["instagram"]
        ]
    ]);

} catch (Throwable $e) {
    handle_exception($e);
}
?>