Archivos incluidos

/api/upload.php
/api/obra_preview.php
/api/populares_7_dias.php
/api/recomendadas_categoria.php
/api/listar_obras.php
/api/buscar.php
/api/_core/catalogos.php

Cómo subirlos

1. Sube catalogos.php dentro de:
   /api/_core/catalogos.php

2. Reemplaza estos archivos en /api:
   upload.php
   obra_preview.php
   populares_7_dias.php
   recomendadas_categoria.php
   listar_obras.php
   buscar.php

Qué cambió

- Se centralizaron las categorías, idiomas y tipos de obra en _core/catalogos.php.
- Se agregaron estas categorías nuevas:
  reconfortante
  novela-grafica
  informativo
  biografico
  animales
  supervivencia
  reencarnacion
  mitologia
- Se eliminaron los arrays repetidos de categorías/idiomas/tipos en los PHP modificados.
- Los endpoints siguen usando los mismos nombres de funciones mediante aliases para no romper la lógica actual.

Verificación realizada

php -l sin errores en:
catalogos.php
upload.php
obra_preview.php
populares_7_dias.php
recomendadas_categoria.php
listar_obras.php
buscar.php
