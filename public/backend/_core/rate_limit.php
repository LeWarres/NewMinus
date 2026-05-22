<?php
// public_html/api/_core/rate_limit.php

require_once __DIR__ . "/db.php";

function get_client_ip(): string {
    return $_SERVER["REMOTE_ADDR"] ?? "unknown";
}

function check_rate_limit(
    mysqli $conexion,
    string $identifier,
    string $action,
    int $maxAttempts,
    int $windowSeconds
): void {
    $identifier = substr($identifier, 0, 191);
    $action = substr($action, 0, 80);

    $now = date("Y-m-d H:i:s");
    $currentTime = time();

    $stmt = $conexion->prepare(
        "SELECT id, attempts, first_attempt, last_attempt
         FROM rate_limits
         WHERE identifier = ? AND action = ?
         LIMIT 1"
    );

    $stmt->bind_param("ss", $identifier, $action);
    $stmt->execute();

    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        $stmtInsert = $conexion->prepare(
            "INSERT INTO rate_limits
             (identifier, action, attempts, first_attempt, last_attempt)
             VALUES (?, ?, 1, ?, ?)"
        );

        $stmtInsert->bind_param("ssss", $identifier, $action, $now, $now);
        $stmtInsert->execute();

        return;
    }

    $row = $result->fetch_assoc();
    $firstAttemptTime = strtotime($row["first_attempt"]);

    if (($currentTime - $firstAttemptTime) > $windowSeconds) {
        $stmtReset = $conexion->prepare(
            "UPDATE rate_limits
             SET attempts = 1,
                 first_attempt = ?,
                 last_attempt = ?
             WHERE id = ?"
        );

        $id = (int)$row["id"];
        $stmtReset->bind_param("ssi", $now, $now, $id);
        $stmtReset->execute();

        return;
    }

    if ((int)$row["attempts"] >= $maxAttempts) {
        json_error("Demasiados intentos. Intenta más tarde.", 429);
    }

    $stmtUpdate = $conexion->prepare(
        "UPDATE rate_limits
         SET attempts = attempts + 1,
             last_attempt = ?
         WHERE id = ?"
    );

    $id = (int)$row["id"];
    $stmtUpdate->bind_param("si", $now, $id);
    $stmtUpdate->execute();
}