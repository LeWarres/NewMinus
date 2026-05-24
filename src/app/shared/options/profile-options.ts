export interface CountryOption {
  code: string;
  name: string;
  labelKey: string;
}

export interface ReadingLanguageOption {
  value: string;
  labelKey: string;
  nativeLabel: string;
}

export const COUNTRY_OPTIONS: CountryOption[] = [
  { code: 'AF', name: 'Afganistán', labelKey: 'common.countries.afghanistan' },
  { code: 'AL', name: 'Albania', labelKey: 'common.countries.albania' },
  { code: 'DE', name: 'Alemania', labelKey: 'common.countries.germany' },
  { code: 'AD', name: 'Andorra', labelKey: 'common.countries.andorra' },
  { code: 'AO', name: 'Angola', labelKey: 'common.countries.angola' },
  { code: 'AI', name: 'Anguila', labelKey: 'common.countries.anguilla' },
  { code: 'AQ', name: 'Antártida', labelKey: 'common.countries.antarctica' },
  { code: 'AG', name: 'Antigua y Barbuda', labelKey: 'common.countries.antigua_and_barbuda' },
  { code: 'SA', name: 'Arabia Saudita', labelKey: 'common.countries.saudi_arabia' },
  { code: 'DZ', name: 'Argelia', labelKey: 'common.countries.algeria' },
  { code: 'AR', name: 'Argentina', labelKey: 'common.countries.argentina' },
  { code: 'AM', name: 'Armenia', labelKey: 'common.countries.armenia' },
  { code: 'AW', name: 'Aruba', labelKey: 'common.countries.aruba' },
  { code: 'AU', name: 'Australia', labelKey: 'common.countries.australia' },
  { code: 'AT', name: 'Austria', labelKey: 'common.countries.austria' },
  { code: 'AZ', name: 'Azerbaiyán', labelKey: 'common.countries.azerbaijan' },
  { code: 'BS', name: 'Bahamas', labelKey: 'common.countries.bahamas' },
  { code: 'BD', name: 'Bangladés', labelKey: 'common.countries.bangladesh' },
  { code: 'BB', name: 'Barbados', labelKey: 'common.countries.barbados' },
  { code: 'BH', name: 'Baréin', labelKey: 'common.countries.bahrain' },
  { code: 'BE', name: 'Bélgica', labelKey: 'common.countries.belgium' },
  { code: 'BZ', name: 'Belice', labelKey: 'common.countries.belize' },
  { code: 'BJ', name: 'Benín', labelKey: 'common.countries.benin' },
  { code: 'BM', name: 'Bermudas', labelKey: 'common.countries.bermuda' },
  { code: 'BY', name: 'Bielorrusia', labelKey: 'common.countries.belarus' },
  { code: 'BO', name: 'Bolivia', labelKey: 'common.countries.bolivia' },
  { code: 'BQ', name: 'Bonaire, San Eustaquio y Saba', labelKey: 'common.countries.bonaire_sint_eustatius_and_saba' },
  { code: 'BA', name: 'Bosnia y Herzegovina', labelKey: 'common.countries.bosnia_and_herzegovina' },
  { code: 'BW', name: 'Botsuana', labelKey: 'common.countries.botswana' },
  { code: 'BR', name: 'Brasil', labelKey: 'common.countries.brazil' },
  { code: 'BN', name: 'Brunéi', labelKey: 'common.countries.brunei' },
  { code: 'BG', name: 'Bulgaria', labelKey: 'common.countries.bulgaria' },
  { code: 'BF', name: 'Burkina Faso', labelKey: 'common.countries.burkina_faso' },
  { code: 'BI', name: 'Burundi', labelKey: 'common.countries.burundi' },
  { code: 'BT', name: 'Bután', labelKey: 'common.countries.bhutan' },
  { code: 'CV', name: 'Cabo Verde', labelKey: 'common.countries.cape_verde' },
  { code: 'KH', name: 'Camboya', labelKey: 'common.countries.cambodia' },
  { code: 'CM', name: 'Camerún', labelKey: 'common.countries.cameroon' },
  { code: 'CA', name: 'Canadá', labelKey: 'common.countries.canada' },
  { code: 'QA', name: 'Catar', labelKey: 'common.countries.qatar' },
  { code: 'TD', name: 'Chad', labelKey: 'common.countries.chad' },
  { code: 'CL', name: 'Chile', labelKey: 'common.countries.chile' },
  { code: 'CN', name: 'China', labelKey: 'common.countries.china' },
  { code: 'CY', name: 'Chipre', labelKey: 'common.countries.cyprus' },
  { code: 'VA', name: 'Ciudad del Vaticano', labelKey: 'common.countries.vatican_city' },
  { code: 'CO', name: 'Colombia', labelKey: 'common.countries.colombia' },
  { code: 'KM', name: 'Comoras', labelKey: 'common.countries.comoros' },
  { code: 'CG', name: 'Congo', labelKey: 'common.countries.congo' },
  { code: 'KP', name: 'Corea del Norte', labelKey: 'common.countries.north_korea' },
  { code: 'KR', name: 'Corea del Sur', labelKey: 'common.countries.south_korea' },
  { code: 'CI', name: 'Costa de Marfil', labelKey: 'common.countries.cote_d_ivoire' },
  { code: 'CR', name: 'Costa Rica', labelKey: 'common.countries.costa_rica' },
  { code: 'HR', name: 'Croacia', labelKey: 'common.countries.croatia' },
  { code: 'CU', name: 'Cuba', labelKey: 'common.countries.cuba' },
  { code: 'CW', name: 'Curazao', labelKey: 'common.countries.curacao' },
  { code: 'DK', name: 'Dinamarca', labelKey: 'common.countries.denmark' },
  { code: 'DM', name: 'Dominica', labelKey: 'common.countries.dominica' },
  { code: 'EC', name: 'Ecuador', labelKey: 'common.countries.ecuador' },
  { code: 'EG', name: 'Egipto', labelKey: 'common.countries.egypt' },
  { code: 'SV', name: 'El Salvador', labelKey: 'common.countries.el_salvador' },
  { code: 'AE', name: 'Emiratos Árabes Unidos', labelKey: 'common.countries.united_arab_emirates' },
  { code: 'ER', name: 'Eritrea', labelKey: 'common.countries.eritrea' },
  { code: 'SK', name: 'Eslovaquia', labelKey: 'common.countries.slovakia' },
  { code: 'SI', name: 'Eslovenia', labelKey: 'common.countries.slovenia' },
  { code: 'ES', name: 'España', labelKey: 'common.countries.spain' },
  { code: 'US', name: 'Estados Unidos', labelKey: 'common.countries.united_states' },
  { code: 'EE', name: 'Estonia', labelKey: 'common.countries.estonia' },
  { code: 'SZ', name: 'Esuatini', labelKey: 'common.countries.eswatini' },
  { code: 'ET', name: 'Etiopía', labelKey: 'common.countries.ethiopia' },
  { code: 'PH', name: 'Filipinas', labelKey: 'common.countries.philippines' },
  { code: 'FI', name: 'Finlandia', labelKey: 'common.countries.finland' },
  { code: 'FJ', name: 'Fiyi', labelKey: 'common.countries.fiji' },
  { code: 'FR', name: 'Francia', labelKey: 'common.countries.france' },
  { code: 'GA', name: 'Gabón', labelKey: 'common.countries.gabon' },
  { code: 'GM', name: 'Gambia', labelKey: 'common.countries.gambia' },
  { code: 'GE', name: 'Georgia', labelKey: 'common.countries.georgia' },
  { code: 'GH', name: 'Ghana', labelKey: 'common.countries.ghana' },
  { code: 'GI', name: 'Gibraltar', labelKey: 'common.countries.gibraltar' },
  { code: 'GD', name: 'Granada', labelKey: 'common.countries.grenada' },
  { code: 'GR', name: 'Grecia', labelKey: 'common.countries.greece' },
  { code: 'GL', name: 'Groenlandia', labelKey: 'common.countries.greenland' },
  { code: 'GP', name: 'Guadalupe', labelKey: 'common.countries.guadeloupe' },
  { code: 'GU', name: 'Guam', labelKey: 'common.countries.guam' },
  { code: 'GT', name: 'Guatemala', labelKey: 'common.countries.guatemala' },
  { code: 'GF', name: 'Guayana Francesa', labelKey: 'common.countries.french_guiana' },
  { code: 'GG', name: 'Guernsey', labelKey: 'common.countries.guernsey' },
  { code: 'GN', name: 'Guinea', labelKey: 'common.countries.guinea' },
  { code: 'GW', name: 'Guinea-Bisáu', labelKey: 'common.countries.guinea_bissau' },
  { code: 'GQ', name: 'Guinea Ecuatorial', labelKey: 'common.countries.equatorial_guinea' },
  { code: 'GY', name: 'Guyana', labelKey: 'common.countries.guyana' },
  { code: 'HT', name: 'Haití', labelKey: 'common.countries.haiti' },
  { code: 'HN', name: 'Honduras', labelKey: 'common.countries.honduras' },
  { code: 'HK', name: 'Hong Kong', labelKey: 'common.countries.hong_kong' },
  { code: 'HU', name: 'Hungría', labelKey: 'common.countries.hungary' },
  { code: 'IN', name: 'India', labelKey: 'common.countries.india' },
  { code: 'ID', name: 'Indonesia', labelKey: 'common.countries.indonesia' },
  { code: 'IQ', name: 'Irak', labelKey: 'common.countries.iraq' },
  { code: 'IR', name: 'Irán', labelKey: 'common.countries.iran' },
  { code: 'IE', name: 'Irlanda', labelKey: 'common.countries.ireland' },
  { code: 'BV', name: 'Isla Bouvet', labelKey: 'common.countries.bouvet_island' },
  { code: 'IM', name: 'Isla de Man', labelKey: 'common.countries.isle_of_man' },
  { code: 'CX', name: 'Isla de Navidad', labelKey: 'common.countries.christmas_island' },
  { code: 'NF', name: 'Isla Norfolk', labelKey: 'common.countries.norfolk_island' },
  { code: 'IS', name: 'Islandia', labelKey: 'common.countries.iceland' },
  { code: 'KY', name: 'Islas Caimán', labelKey: 'common.countries.cayman_islands' },
  { code: 'CC', name: 'Islas Cocos', labelKey: 'common.countries.cocos_islands' },
  { code: 'CK', name: 'Islas Cook', labelKey: 'common.countries.cook_islands' },
  { code: 'FO', name: 'Islas Feroe', labelKey: 'common.countries.faroe_islands' },
  { code: 'GS', name: 'Islas Georgias del Sur y Sandwich del Sur', labelKey: 'common.countries.south_georgia_and_south_sandwich_islands' },
  { code: 'HM', name: 'Islas Heard y McDonald', labelKey: 'common.countries.heard_island_and_mcdonald_islands' },
  { code: 'FK', name: 'Islas Malvinas', labelKey: 'common.countries.falkland_islands' },
  { code: 'MP', name: 'Islas Marianas del Norte', labelKey: 'common.countries.northern_mariana_islands' },
  { code: 'MH', name: 'Islas Marshall', labelKey: 'common.countries.marshall_islands' },
  { code: 'PN', name: 'Islas Pitcairn', labelKey: 'common.countries.pitcairn_islands' },
  { code: 'SB', name: 'Islas Salomón', labelKey: 'common.countries.solomon_islands' },
  { code: 'TC', name: 'Islas Turcas y Caicos', labelKey: 'common.countries.turks_and_caicos_islands' },
  { code: 'UM', name: 'Islas Ultramarinas Menores de Estados Unidos', labelKey: 'common.countries.united_states_minor_outlying_islands' },
  { code: 'VG', name: 'Islas Vírgenes Británicas', labelKey: 'common.countries.british_virgin_islands' },
  { code: 'VI', name: 'Islas Vírgenes de los Estados Unidos', labelKey: 'common.countries.united_states_virgin_islands' },
  { code: 'IL', name: 'Israel', labelKey: 'common.countries.israel' },
  { code: 'IT', name: 'Italia', labelKey: 'common.countries.italy' },
  { code: 'JM', name: 'Jamaica', labelKey: 'common.countries.jamaica' },
  { code: 'JP', name: 'Japón', labelKey: 'common.countries.japan' },
  { code: 'JE', name: 'Jersey', labelKey: 'common.countries.jersey' },
  { code: 'JO', name: 'Jordania', labelKey: 'common.countries.jordan' },
  { code: 'KZ', name: 'Kazajistán', labelKey: 'common.countries.kazakhstan' },
  { code: 'KE', name: 'Kenia', labelKey: 'common.countries.kenya' },
  { code: 'KG', name: 'Kirguistán', labelKey: 'common.countries.kyrgyzstan' },
  { code: 'KI', name: 'Kiribati', labelKey: 'common.countries.kiribati' },
  { code: 'KW', name: 'Kuwait', labelKey: 'common.countries.kuwait' },
  { code: 'LA', name: 'Laos', labelKey: 'common.countries.laos' },
  { code: 'LS', name: 'Lesoto', labelKey: 'common.countries.lesotho' },
  { code: 'LV', name: 'Letonia', labelKey: 'common.countries.latvia' },
  { code: 'LB', name: 'Líbano', labelKey: 'common.countries.lebanon' },
  { code: 'LR', name: 'Liberia', labelKey: 'common.countries.liberia' },
  { code: 'LY', name: 'Libia', labelKey: 'common.countries.libya' },
  { code: 'LI', name: 'Liechtenstein', labelKey: 'common.countries.liechtenstein' },
  { code: 'LT', name: 'Lituania', labelKey: 'common.countries.lithuania' },
  { code: 'LU', name: 'Luxemburgo', labelKey: 'common.countries.luxembourg' },
  { code: 'MO', name: 'Macao', labelKey: 'common.countries.macao' },
  { code: 'MK', name: 'Macedonia del Norte', labelKey: 'common.countries.north_macedonia' },
  { code: 'MG', name: 'Madagascar', labelKey: 'common.countries.madagascar' },
  { code: 'MY', name: 'Malasia', labelKey: 'common.countries.malaysia' },
  { code: 'MW', name: 'Malaui', labelKey: 'common.countries.malawi' },
  { code: 'MV', name: 'Maldivas', labelKey: 'common.countries.maldives' },
  { code: 'ML', name: 'Mali', labelKey: 'common.countries.mali' },
  { code: 'MT', name: 'Malta', labelKey: 'common.countries.malta' },
  { code: 'MA', name: 'Marruecos', labelKey: 'common.countries.morocco' },
  { code: 'MQ', name: 'Martinica', labelKey: 'common.countries.martinique' },
  { code: 'MU', name: 'Mauricio', labelKey: 'common.countries.mauritius' },
  { code: 'MR', name: 'Mauritania', labelKey: 'common.countries.mauritania' },
  { code: 'YT', name: 'Mayotte', labelKey: 'common.countries.mayotte' },
  { code: 'MX', name: 'México', labelKey: 'common.countries.mexico' },
  { code: 'FM', name: 'Micronesia', labelKey: 'common.countries.micronesia' },
  { code: 'MD', name: 'Moldavia', labelKey: 'common.countries.moldova' },
  { code: 'MC', name: 'Mónaco', labelKey: 'common.countries.monaco' },
  { code: 'MN', name: 'Mongolia', labelKey: 'common.countries.mongolia' },
  { code: 'ME', name: 'Montenegro', labelKey: 'common.countries.montenegro' },
  { code: 'MS', name: 'Montserrat', labelKey: 'common.countries.montserrat' },
  { code: 'MZ', name: 'Mozambique', labelKey: 'common.countries.mozambique' },
  { code: 'MM', name: 'Myanmar', labelKey: 'common.countries.myanmar' },
  { code: 'NA', name: 'Namibia', labelKey: 'common.countries.namibia' },
  { code: 'NR', name: 'Nauru', labelKey: 'common.countries.nauru' },
  { code: 'NP', name: 'Nepal', labelKey: 'common.countries.nepal' },
  { code: 'NI', name: 'Nicaragua', labelKey: 'common.countries.nicaragua' },
  { code: 'NE', name: 'Níger', labelKey: 'common.countries.niger' },
  { code: 'NG', name: 'Nigeria', labelKey: 'common.countries.nigeria' },
  { code: 'NU', name: 'Niue', labelKey: 'common.countries.niue' },
  { code: 'NO', name: 'Noruega', labelKey: 'common.countries.norway' },
  { code: 'NC', name: 'Nueva Caledonia', labelKey: 'common.countries.new_caledonia' },
  { code: 'NZ', name: 'Nueva Zelanda', labelKey: 'common.countries.new_zealand' },
  { code: 'OM', name: 'Omán', labelKey: 'common.countries.oman' },
  { code: 'NL', name: 'Países Bajos', labelKey: 'common.countries.netherlands' },
  { code: 'PK', name: 'Pakistán', labelKey: 'common.countries.pakistan' },
  { code: 'PW', name: 'Palaos', labelKey: 'common.countries.palau' },
  { code: 'PS', name: 'Palestina', labelKey: 'common.countries.palestine' },
  { code: 'PA', name: 'Panamá', labelKey: 'common.countries.panama' },
  { code: 'PG', name: 'Papúa Nueva Guinea', labelKey: 'common.countries.papua_new_guinea' },
  { code: 'PY', name: 'Paraguay', labelKey: 'common.countries.paraguay' },
  { code: 'PE', name: 'Perú', labelKey: 'common.countries.peru' },
  { code: 'PF', name: 'Polinesia Francesa', labelKey: 'common.countries.french_polynesia' },
  { code: 'PL', name: 'Polonia', labelKey: 'common.countries.poland' },
  { code: 'PT', name: 'Portugal', labelKey: 'common.countries.portugal' },
  { code: 'PR', name: 'Puerto Rico', labelKey: 'common.countries.puerto_rico' },
  { code: 'GB', name: 'Reino Unido', labelKey: 'common.countries.united_kingdom' },
  { code: 'CF', name: 'República Centroafricana', labelKey: 'common.countries.central_african_republic' },
  { code: 'CZ', name: 'República Checa', labelKey: 'common.countries.czech_republic' },
  { code: 'CD', name: 'República Democrática del Congo', labelKey: 'common.countries.democratic_republic_of_the_congo' },
  { code: 'DO', name: 'República Dominicana', labelKey: 'common.countries.dominican_republic' },
  { code: 'RE', name: 'Reunión', labelKey: 'common.countries.reunion' },
  { code: 'RW', name: 'Ruanda', labelKey: 'common.countries.rwanda' },
  { code: 'RO', name: 'Rumanía', labelKey: 'common.countries.romania' },
  { code: 'RU', name: 'Rusia', labelKey: 'common.countries.russia' },
  { code: 'EH', name: 'Sahara Occidental', labelKey: 'common.countries.western_sahara' },
  { code: 'WS', name: 'Samoa', labelKey: 'common.countries.samoa' },
  { code: 'AS', name: 'Samoa Americana', labelKey: 'common.countries.american_samoa' },
  { code: 'BL', name: 'San Bartolomé', labelKey: 'common.countries.saint_barthelemy' },
  { code: 'KN', name: 'San Cristóbal y Nieves', labelKey: 'common.countries.saint_kitts_and_nevis' },
  { code: 'SM', name: 'San Marino', labelKey: 'common.countries.san_marino' },
  { code: 'MF', name: 'San Martín', labelKey: 'common.countries.saint_martin' },
  { code: 'PM', name: 'San Pedro y Miquelón', labelKey: 'common.countries.saint_pierre_and_miquelon' },
  { code: 'VC', name: 'San Vicente y las Granadinas', labelKey: 'common.countries.saint_vincent_and_the_grenadines' },
  { code: 'SH', name: 'Santa Elena, Ascensión y Tristán de Acuña', labelKey: 'common.countries.saint_helena_ascension_and_tristan_da_cunha' },
  { code: 'LC', name: 'Santa Lucía', labelKey: 'common.countries.saint_lucia' },
  { code: 'ST', name: 'Santo Tomé y Príncipe', labelKey: 'common.countries.sao_tome_and_principe' },
  { code: 'SN', name: 'Senegal', labelKey: 'common.countries.senegal' },
  { code: 'RS', name: 'Serbia', labelKey: 'common.countries.serbia' },
  { code: 'SC', name: 'Seychelles', labelKey: 'common.countries.seychelles' },
  { code: 'SL', name: 'Sierra Leona', labelKey: 'common.countries.sierra_leone' },
  { code: 'SG', name: 'Singapur', labelKey: 'common.countries.singapore' },
  { code: 'SX', name: 'Sint Maarten', labelKey: 'common.countries.sint_maarten' },
  { code: 'SY', name: 'Siria', labelKey: 'common.countries.syria' },
  { code: 'SO', name: 'Somalia', labelKey: 'common.countries.somalia' },
  { code: 'LK', name: 'Sri Lanka', labelKey: 'common.countries.sri_lanka' },
  { code: 'ZA', name: 'Sudáfrica', labelKey: 'common.countries.south_africa' },
  { code: 'SD', name: 'Sudán', labelKey: 'common.countries.sudan' },
  { code: 'SS', name: 'Sudán del Sur', labelKey: 'common.countries.south_sudan' },
  { code: 'SE', name: 'Suecia', labelKey: 'common.countries.sweden' },
  { code: 'CH', name: 'Suiza', labelKey: 'common.countries.switzerland' },
  { code: 'SR', name: 'Surinam', labelKey: 'common.countries.suriname' },
  { code: 'SJ', name: 'Svalbard y Jan Mayen', labelKey: 'common.countries.svalbard_and_jan_mayen' },
  { code: 'TH', name: 'Tailandia', labelKey: 'common.countries.thailand' },
  { code: 'TW', name: 'Taiwán', labelKey: 'common.countries.taiwan' },
  { code: 'TZ', name: 'Tanzania', labelKey: 'common.countries.tanzania' },
  { code: 'TJ', name: 'Tayikistán', labelKey: 'common.countries.tajikistan' },
  { code: 'IO', name: 'Territorio Británico del Océano Índico', labelKey: 'common.countries.british_indian_ocean_territory' },
  { code: 'TF', name: 'Territorios Australes Franceses', labelKey: 'common.countries.french_southern_territories' },
  { code: 'TL', name: 'Timor Oriental', labelKey: 'common.countries.timor_leste' },
  { code: 'TG', name: 'Togo', labelKey: 'common.countries.togo' },
  { code: 'TK', name: 'Tokelau', labelKey: 'common.countries.tokelau' },
  { code: 'TO', name: 'Tonga', labelKey: 'common.countries.tonga' },
  { code: 'TT', name: 'Trinidad y Tobago', labelKey: 'common.countries.trinidad_and_tobago' },
  { code: 'TN', name: 'Túnez', labelKey: 'common.countries.tunisia' },
  { code: 'TM', name: 'Turkmenistán', labelKey: 'common.countries.turkmenistan' },
  { code: 'TR', name: 'Turquía', labelKey: 'common.countries.turkey' },
  { code: 'TV', name: 'Tuvalu', labelKey: 'common.countries.tuvalu' },
  { code: 'UA', name: 'Ucrania', labelKey: 'common.countries.ukraine' },
  { code: 'UG', name: 'Uganda', labelKey: 'common.countries.uganda' },
  { code: 'UY', name: 'Uruguay', labelKey: 'common.countries.uruguay' },
  { code: 'UZ', name: 'Uzbekistán', labelKey: 'common.countries.uzbekistan' },
  { code: 'VU', name: 'Vanuatu', labelKey: 'common.countries.vanuatu' },
  { code: 'VE', name: 'Venezuela', labelKey: 'common.countries.venezuela' },
  { code: 'VN', name: 'Vietnam', labelKey: 'common.countries.vietnam' },
  { code: 'WF', name: 'Wallis y Futuna', labelKey: 'common.countries.wallis_and_futuna' },
  { code: 'YE', name: 'Yemen', labelKey: 'common.countries.yemen' },
  { code: 'DJ', name: 'Yibuti', labelKey: 'common.countries.djibouti' },
  { code: 'ZM', name: 'Zambia', labelKey: 'common.countries.zambia' },
  { code: 'ZW', name: 'Zimbabue', labelKey: 'common.countries.zimbabwe' },
  { code: 'OT', name: 'Otro', labelKey: 'common.countries.other' },
];

export const READING_LANGUAGE_OPTIONS: ReadingLanguageOption[] = [
  { value: 'ES', labelKey: 'common.languages.es', nativeLabel: 'Español' },
  { value: 'EN', labelKey: 'common.languages.en', nativeLabel: 'English' },
  { value: 'JA', labelKey: 'common.languages.ja', nativeLabel: '日本語' },
  { value: 'KO', labelKey: 'common.languages.ko', nativeLabel: '한국어' },
  { value: 'ZH', labelKey: 'common.languages.zh', nativeLabel: '中文' },
  { value: 'FR', labelKey: 'common.languages.fr', nativeLabel: 'Français' },
  { value: 'DE', labelKey: 'common.languages.de', nativeLabel: 'Deutsch' },
  { value: 'PT', labelKey: 'common.languages.pt', nativeLabel: 'Português' },
  { value: 'IT', labelKey: 'common.languages.it', nativeLabel: 'Italiano' },
  { value: 'RU', labelKey: 'common.languages.ru', nativeLabel: 'Русский' },
  { value: 'AR', labelKey: 'common.languages.ar', nativeLabel: 'العربية' },
  { value: 'HI', labelKey: 'common.languages.hi', nativeLabel: 'हिन्दी' },
  { value: 'ID', labelKey: 'common.languages.id', nativeLabel: 'Bahasa Indonesia' },
  { value: 'VI', labelKey: 'common.languages.vi', nativeLabel: 'Tiếng Việt' },
  { value: 'TH', labelKey: 'common.languages.th', nativeLabel: 'ไทย' },
  { value: 'TR', labelKey: 'common.languages.tr', nativeLabel: 'Türkçe' },
  { value: 'PL', labelKey: 'common.languages.pl', nativeLabel: 'Polski' },
  { value: 'NL', labelKey: 'common.languages.nl', nativeLabel: 'Nederlands' }
];
export interface WorkCategoryOption {
  value: string;
  labelKey: string;
  nativeLabel: string;
}

export const WORK_CATEGORY_OPTIONS: WorkCategoryOption[] = [
  { value: 'accion', labelKey: 'common.categories.accion', nativeLabel: 'Acción' },
  { value: 'aventura', labelKey: 'common.categories.aventura', nativeLabel: 'Aventura' },
  { value: 'comedia', labelKey: 'common.categories.comedia', nativeLabel: 'Comedia' },
  { value: 'drama', labelKey: 'common.categories.drama', nativeLabel: 'Drama' },
  { value: 'fantasia', labelKey: 'common.categories.fantasia', nativeLabel: 'Fantasía' },
  { value: 'romance', labelKey: 'common.categories.romance', nativeLabel: 'Romance' },
  { value: 'terror', labelKey: 'common.categories.terror', nativeLabel: 'Terror' },
  { value: 'ciencia-ficcion', labelKey: 'common.categories.ciencia_ficcion', nativeLabel: 'Ciencia ficción' },
  { value: 'misterio', labelKey: 'common.categories.misterio', nativeLabel: 'Misterio' },
  { value: 'suspenso', labelKey: 'common.categories.suspenso', nativeLabel: 'Suspenso' },
  { value: 'sobrenatural', labelKey: 'common.categories.sobrenatural', nativeLabel: 'Sobrenatural' },
  { value: 'psicologico', labelKey: 'common.categories.psicologico', nativeLabel: 'Psicológico' },
  { value: 'slice-of-life', labelKey: 'common.categories.slice_of_life', nativeLabel: 'Slice of life' },
  { value: 'vida-escolar', labelKey: 'common.categories.vida_escolar', nativeLabel: 'Vida escolar' },
  { value: 'deportes', labelKey: 'common.categories.deportes', nativeLabel: 'Deportes' },
  { value: 'artes-marciales', labelKey: 'common.categories.artes_marciales', nativeLabel: 'Artes marciales' },
  { value: 'mecha', labelKey: 'common.categories.mecha', nativeLabel: 'Mecha' },
  { value: 'isekai', labelKey: 'common.categories.isekai', nativeLabel: 'Isekai' },
  { value: 'historico', labelKey: 'common.categories.historico', nativeLabel: 'Histórico' },
  { value: 'musica', labelKey: 'common.categories.musica', nativeLabel: 'Música' },
  { value: 'cocina', labelKey: 'common.categories.cocina', nativeLabel: 'Cocina' },
  { value: 'magia', labelKey: 'common.categories.magia', nativeLabel: 'Magia' },
  { value: 'superheroes', labelKey: 'common.categories.superheroes', nativeLabel: 'Superhéroes' },
  { value: 'crimen', labelKey: 'common.categories.crimen', nativeLabel: 'Crimen' },
  { value: 'post-apocaliptico', labelKey: 'common.categories.post_apocaliptico', nativeLabel: 'Post-apocalíptico' },
  { value: 'cyberpunk', labelKey: 'common.categories.cyberpunk', nativeLabel: 'Cyberpunk' },
  { value: 'steampunk', labelKey: 'common.categories.steampunk', nativeLabel: 'Steampunk' },
  { value: 'guerra', labelKey: 'common.categories.guerra', nativeLabel: 'Guerra' },
  { value: 'parodia', labelKey: 'common.categories.parodia', nativeLabel: 'Parodia' },
  { value: 'tragedia', labelKey: 'common.categories.tragedia', nativeLabel: 'Tragedia' },

  { value: 'reconfortante', labelKey: 'common.categories.reconfortante', nativeLabel: 'Reconfortante' },
  { value: 'novela-grafica', labelKey: 'common.categories.novela_grafica', nativeLabel: 'Novela gráfica' },
  { value: 'informativo', labelKey: 'common.categories.informativo', nativeLabel: 'Informativo' },
  { value: 'biografico', labelKey: 'common.categories.biografico', nativeLabel: 'Biográfico' },
  { value: 'animales', labelKey: 'common.categories.animales', nativeLabel: 'Animales' },
  { value: 'supervivencia', labelKey: 'common.categories.supervivencia', nativeLabel: 'Supervivencia' },
  { value: 'reencarnacion', labelKey: 'common.categories.reencarnacion', nativeLabel: 'Reencarnación' },
  { value: 'mitologia', labelKey: 'common.categories.mitologia', nativeLabel: 'Mitología' },

  { value: 'shonen', labelKey: 'common.categories.shonen', nativeLabel: 'Shonen' },
  { value: 'shojo', labelKey: 'common.categories.shojo', nativeLabel: 'Shojo' },
  { value: 'seinen', labelKey: 'common.categories.seinen', nativeLabel: 'Seinen' },
  { value: 'josei', labelKey: 'common.categories.josei', nativeLabel: 'Josei' },
  { value: 'kodomo', labelKey: 'common.categories.kodomo', nativeLabel: 'Kodomo' },
  { value: 'boys-love', labelKey: 'common.categories.boys_love', nativeLabel: 'Boys Love' },
  { value: 'girls-love', labelKey: 'common.categories.girls_love', nativeLabel: 'Girls Love' },
  { value: 'nsfw', labelKey: 'common.categories.nsfw', nativeLabel: 'NSFW' }
];

export const WORK_CATEGORY_VALUES = WORK_CATEGORY_OPTIONS.map(category => category.value);

export function normalizeWorkCategoryValue(category?: string | null): string {
  const rawCategory = String(category || '').trim();

  if (!rawCategory) {
    return '';
  }

  return rawCategory
    .replace(/^common\.categories\./i, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' y ')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function getWorkCategoryOption(category?: string | null): WorkCategoryOption | undefined {
  const normalizedCategory = normalizeWorkCategoryValue(category);

  if (!normalizedCategory) {
    return undefined;
  }

  return WORK_CATEGORY_OPTIONS.find(option => {
    return normalizeWorkCategoryValue(option.value) === normalizedCategory ||
      normalizeWorkCategoryValue(option.labelKey) === normalizedCategory;
  });
}

export function getWorkCategoryTranslationKey(category?: string | null): string {
  const option = getWorkCategoryOption(category);

  if (option) {
    return option.labelKey;
  }

  const normalizedCategory = normalizeWorkCategoryValue(category);

  return normalizedCategory
    ? `common.categories.${normalizedCategory}`
    : '';
}

export function formatWorkCategoryFallback(category?: string | null, emptyFallback = ''): string {
  const fallback = String(category || '')
    .trim()
    .replace(/^common\.categories\./i, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!fallback) {
    return emptyFallback;
  }

  return fallback.charAt(0).toUpperCase() + fallback.slice(1);
}

export function getWorkCategoryLabel(
  category: string | null | undefined,
  translate: (key: string) => string,
  emptyFallback = ''
): string {
  const translationKey = getWorkCategoryTranslationKey(category);

  if (!translationKey) {
    return emptyFallback;
  }

  const translated = translate(translationKey);

  if (!translated || translated === translationKey) {
    const option = getWorkCategoryOption(category);
    return option?.nativeLabel || formatWorkCategoryFallback(category, emptyFallback);
  }

  return translated;
}
