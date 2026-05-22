<?php
// public_html/api/_core/turnstile.php

function require_turnstile(?string $token): void {
    $token = trim($token ?? "");

    if ($token === "") {
        json_error("Completa la verificación anti-bot", 400);
    }

    $config = require __DIR__ . "/config.php";
    $secret = $config["turnstile_secret_key"] ?? "";

    if ($secret === "") {
        throw new Exception("Turnstile no está configurado");
    }

    $remoteIp = $_SERVER["REMOTE_ADDR"] ?? "";

    $postData = http_build_query([
        "secret" => $secret,
        "response" => $token,
        "remoteip" => $remoteIp
    ]);

    $responseText = false;

    if (function_exists("curl_init")) {
        $ch = curl_init("https://challenges.cloudflare.com/turnstile/v0/siteverify");

        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $postData,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 10,
            CURLOPT_HTTPHEADER => [
                "Content-Type: application/x-www-form-urlencoded"
            ]
        ]);

        $responseText = curl_exec($ch);

        if ($responseText === false) {
            curl_close($ch);
            throw new Exception("No se pudo validar Turnstile");
        }

        curl_close($ch);
    } else {
        $context = stream_context_create([
            "http" => [
                "method" => "POST",
                "header" => "Content-Type: application/x-www-form-urlencoded\r\n",
                "content" => $postData,
                "timeout" => 10
            ]
        ]);

        $responseText = file_get_contents(
            "https://challenges.cloudflare.com/turnstile/v0/siteverify",
            false,
            $context
        );
    }

    if (!$responseText) {
        throw new Exception("No se pudo validar Turnstile");
    }

    $result = json_decode($responseText, true);

    if (!is_array($result) || empty($result["success"])) {
        json_error("No se pudo validar la verificación anti-bot", 403);
    }
}