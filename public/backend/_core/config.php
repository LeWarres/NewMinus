<?php
// public_html/api/_core/config.php

return [
    /*
      En producción tu Angular estará en https://minuscreators.com.
      Dejamos localhost para que puedas seguir probando desde Angular local.
    */
    "allowed_origins" => [
        "https://minuscreators.com",
        "https://www.minuscreators.com",
        "http://localhost:4200"
    ],

    "database" => [
        "host" => "localhost",
        "user" => "u400851681_Minus",
        "password" => "Mocoshipoyo1-9",
        "name" => "u400851681_formularios"
    ],
    'turnstile_secret_key' => '0x4AAAAAADOyxfh_1hHAATFYikLVG10BjXY',
    /*
      En producción déjalo false.
      Si estás depurando y quieres ver errores técnicos temporalmente, pon true.
    */
    "debug" => true
];


