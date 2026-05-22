<?php
require_once __DIR__ . "/_core/db.php";
require_once __DIR__ . "/_core/csrf.php";
require_once __DIR__ . "/_core/rate_limit.php";
require_once __DIR__ . "/_core/email.php";
require_once __DIR__ . "/_core/turnstile.php";

function get_email_domain(string $email): string {
    $parts = explode("@", strtolower(trim($email)));

    if (count($parts) !== 2) {
        return "";
    }

    return $parts[1];
}

function is_blocked_disposable_domain(string $domain): bool {
    $blocked = [
        "10minutemail.com",
        "10minutemail.net",
        "20minutemail.com",
        "guerrillamail.com",
        "guerrillamail.net",
        "guerrillamail.org",
        "mailinator.com",
        "tempmail.com",
        "temp-mail.org",
        "yopmail.com",
        "yopmail.fr",
        "trashmail.com",
        "sharklasers.com",
        "getnada.com",
        "dispostable.com",
        "maildrop.cc",
        "moakt.com",
        "fakeinbox.com",
        "throwawaymail.com",
        "emailondeck.com",
        "tempail.com",
        "mintemail.com",
        "mytemp.email"
    ];

    return in_array($domain, $blocked, true);
}

function is_allowed_email_domain(string $domain): bool {
    $allowed = [
        "gmail.com",
        "googlemail.com",

        "hotmail.com",
        "hotmail.com.mx",
        "hotmail.es",
        "outlook.com",
        "outlook.es",
        "live.com",
        "live.com.mx",
        "msn.com",

        "yahoo.com",
        "yahoo.com.mx",
        "yahoo.es",
        "ymail.com",
        "rocketmail.com",

        "icloud.com",
        "me.com",
        "mac.com",

        "proton.me",
        "protonmail.com",
        "pm.me",

        "zoho.com",
        "zohomail.com",

        "gmx.com",
        "gmx.net",
        "gmx.de",
        "web.de",

        "aol.com",
        "mail.com",
        "fastmail.com",
        "hey.com",

        "tuta.com",
        "tutanota.com",
        "tutanota.de",

        "yandex.com",
        "yandex.ru",

        "mail.ru",
        "bk.ru",
        "inbox.ru",
        "list.ru",

        "naver.com",
        "daum.net",
        "kakao.com",

        "qq.com",
        "163.com",
        "126.com",
        "sina.com",

        "seznam.cz",
        "centrum.cz",

        "orange.fr",
        "free.fr",
        "laposte.net",
        "wanadoo.fr",

        "libero.it",
        "virgilio.it",

        "wp.pl",
        "o2.pl",
        "onet.pl",
        "interia.pl",

        "rediffmail.com",

        "uol.com.br",
        "bol.com.br",
        "terra.com.br"
    ];

    return in_array($domain, $allowed, true);
}

function idiomas_lectura_permitidos(): array {
    return [
        "ES",
        "EN",
        "JA",
        "KO",
        "ZH",
        "FR",
        "DE",
        "PT",
        "IT",
        "RU",
        "AR",
        "HI",
        "ID",
        "VI",
        "TH",
        "TR",
        "PL",
        "NL"
    ];
}

function idioma_lectura_desde_interfaz(string $idiomaInterfaz): string {
    $idiomaInterfaz = strtolower(trim($idiomaInterfaz));

    if ($idiomaInterfaz === "es") {
        return "ES";
    }

    return "EN";
}

function normalizar_idiomas_lectura($inputIdiomas, string $idiomaFallback): array {
    if (is_string($inputIdiomas)) {
        $decoded = json_decode($inputIdiomas, true);
        $inputIdiomas = is_array($decoded) ? $decoded : [];
    }

    if (!is_array($inputIdiomas)) {
        $inputIdiomas = [];
    }

    $permitidos = idiomas_lectura_permitidos();
    $normalizados = [];

    foreach ($inputIdiomas as $idioma) {
        $valor = strtoupper(trim((string)$idioma));

        if ($valor === "") {
            continue;
        }

        if (!in_array($valor, $permitidos, true)) {
            json_error("Un idioma de lectura no es válido", 400);
        }

        if (!in_array($valor, $normalizados, true)) {
            $normalizados[] = $valor;
        }
    }

    if (count($normalizados) === 0) {
        $fallback = strtoupper(trim($idiomaFallback));

        if (!in_array($fallback, $permitidos, true)) {
            $fallback = "EN";
        }

        $normalizados[] = $fallback;
    }

    return $normalizados;
}

function bool_desde_input($valor): int {
    if (is_bool($valor)) {
        return $valor ? 1 : 0;
    }

    $normalizado = strtolower(trim((string)$valor));

    return in_array($normalizado, ["1", "true", "on", "yes", "si", "sí"], true)
        ? 1
        : 0;
}

try {
    if ($_SERVER["REQUEST_METHOD"] !== "POST") {
        json_error("Método no permitido", 405);
    }

    require_csrf();

    $conexion = get_db();
    $input = read_json_body();

    /*
      Honeypot anti-bot.
    */
    $honeypot = trim($input["website"] ?? "");

    if ($honeypot !== "") {
        json_error("Solicitud inválida", 400);
    }

    $username = trim($input["username"] ?? "");
    $email = strtolower(trim($input["email"] ?? ""));
    $passwordPlano = $input["password"] ?? "";
    $nacionalidad = trim($input["nacionalidad"] ?? "");
    $turnstileToken = trim($input["turnstileToken"] ?? "");

    $mostrarNsfw = bool_desde_input($input["mostrarNsfw"] ?? false);

    $idiomaInterfaz = trim($input["idiomaInterfaz"] ?? "en");
    $idiomaFallback = idioma_lectura_desde_interfaz($idiomaInterfaz);

    $idiomasLectura = normalizar_idiomas_lectura(
        $input["idiomasLectura"] ?? [],
        $idiomaFallback
    );

    $role = "creator";

    if ($username === "" || $email === "" || $passwordPlano === "") {
        json_error("Usuario, email y contraseña son obligatorios", 400);
    }

    if (!preg_match('/^[A-Za-z0-9_]{3,30}$/', $username)) {
        json_error("El usuario debe tener de 3 a 30 caracteres y solo usar letras, números o guion bajo", 400);
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        json_error("El email no es válido", 400);
    }

    $domain = get_email_domain($email);

    if ($domain === "") {
        json_error("El email no es válido", 400);
    }

    if (is_blocked_disposable_domain($domain)) {
        json_error("No se permiten correos temporales", 400);
    }

    if (!is_allowed_email_domain($domain)) {
        json_error("Usa un correo de un proveedor confiable como Gmail, Outlook, Hotmail, Yahoo, iCloud o Proton", 400);
    }

    if (strlen($passwordPlano) < 8) {
        json_error("La contraseña debe tener mínimo 8 caracteres", 400);
    }

    $ip = get_client_ip();

    check_rate_limit($conexion, $ip, "register_ip", 5, 3600);
    check_rate_limit($conexion, $email, "register_email", 3, 3600);

    require_turnstile($turnstileToken);

    $stmtExiste = $conexion->prepare(
        "SELECT id, email, username
         FROM usuarios
         WHERE email = ? OR username = ?
         LIMIT 1"
    );

    $stmtExiste->bind_param("ss", $email, $username);
    $stmtExiste->execute();

    $resultadoExiste = $stmtExiste->get_result();

    if ($resultadoExiste->num_rows > 0) {
        $existente = $resultadoExiste->fetch_assoc();

        if (strtolower($existente["email"]) === $email) {
            json_error("Ese correo ya está registrado", 409);
        }

        json_error("Ese nombre de usuario ya está en uso", 409);
    }

    $passwordHash = password_hash($passwordPlano, PASSWORD_DEFAULT);

    $imgPerfil = "obras/paleta/tres.png";
    $imgBanner = "obras/paleta/portada.png";

    $token = bin2hex(random_bytes(32));
    $tokenHash = hash("sha256", $token);
    $expires = date("Y-m-d H:i:s", time() + 86400);
    $sentAt = date("Y-m-d H:i:s");

    $conexion->begin_transaction();

    $stmt = $conexion->prepare(
        "INSERT INTO usuarios 
        (
            username,
            email,
            password_hash,
            role,
            nacionalidad,
            img_perfil,
            img_banner,
            mostrar_nsfw,
            email_verificado,
            email_verification_token_hash,
            email_verification_expires,
            email_verification_last_sent_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)"
    );

    $stmt->bind_param(
        "sssssssisss",
        $username,
        $email,
        $passwordHash,
        $role,
        $nacionalidad,
        $imgPerfil,
        $imgBanner,
        $mostrarNsfw,
        $tokenHash,
        $expires,
        $sentAt
    );

    $stmt->execute();

    $usuarioId = (int)$conexion->insert_id;

    $stmtIdioma = $conexion->prepare(
        "INSERT INTO usuario_idiomas_lectura
         (usuario_id, idioma)
         VALUES (?, ?)"
    );

    foreach ($idiomasLectura as $idiomaLectura) {
        $stmtIdioma->bind_param("is", $usuarioId, $idiomaLectura);
        $stmtIdioma->execute();
    }

    $correoEnviado = send_verification_email_link($email, $username, $token);

    if (!$correoEnviado) {
        throw new Exception("No se pudo enviar el correo de verificación");
    }

    $conexion->commit();

    json_success([
        "authenticated" => false,
        "requiresVerification" => true,
        "mensaje" => "Cuenta creada. Revisa tu correo para verificarla antes de iniciar sesión.",
        "email" => $email,
        "idiomasLectura" => $idiomasLectura,
        "mostrarNsfw" => (bool)$mostrarNsfw
    ]);

} catch (Throwable $e) {
    if (isset($conexion)) {
        $conexion->rollback();
    }

    handle_exception($e);
}
?>