# Adaptación móvil de Reportes HYS v239

Implementada después de conectar el almacenamiento Supabase de desarrollo, por solicitud del usuario. Se conserva el respaldo anterior Reportes-HYS-v239-supabase.zip y la versión de alojamiento 2 sin cambios.

## Cambios

- Tarjetas de ingreso en una columna, títulos y separación adaptados al ancho del teléfono.
- Encabezado legible con nombre, rol, módulos y botones completos. Navegación en dos columnas, con la sección activa visible.
- Inicio y formularios ocupan el ancho útil; controles de 16 px y superficies táctiles de al menos 44 px en las acciones principales.
- Las filas de Actividades, Actividades por área y Hallazgos se presentan como fichas con etiquetas en pantallas pequeñas. En escritorio se mantiene la tabla. No se eliminan columnas ni se cambian datos.
- Acciones de guardar, finalizar, nuevo informe y PDF dispuestas verticalmente en móvil.
- Barra de herramientas autorizadas compacta; Usuarios, Áreas y Apariencia no se salen del teléfono. Se conservan los permisos y la visibilidad de cada rol.
- Paneles de usuarios, áreas, historial, opciones y apariencia con una columna, campos completos y desplazamiento vertical.
- Ventanas de registros con campos desplazables y acciones accesibles; fondos de los diálogos bloqueados para evitar desplazar la pantalla de atrás.
- Miniaturas adaptativas y fotografía ampliada contenida en la pantalla. El PDF mantiene la cantidad de fotografías por fila elegida en Configuración.
- El iframe de OTROS elimina la altura mínima rígida anterior y respeta el espacio de la barra inferior.
- Se retiró el display:grid forzado de la presentación de módulos cuando impedía aplicar el diseño móvil. Se corrigió también la regla heredada de OTROS que forzaba esa cuadrícula.

## Protección

Las reglas nuevas están limitadas a pantalla, con puntos de adaptación para teléfono, tableta y horizontal. No se cambian los campos, eventos de guardado, permisos efectivos, esquema ni datos de Supabase.

El motor PDF coincide exactamente con el respaldo conectado anterior al cambio móvil: SHA256 77d06307433000211b3b65eb44918ac1fb52ac8c39cde09d59929201d21a90fc. Los atributos data-label añadidos a las celdas sirven solo para mostrar etiquetas; el motor PDF sigue leyendo el mismo informe estructurado.

## Pruebas

PRUEBAS-MOVIL-v239.json registra las medidas reales del navegador integrado con datos ficticios. Se comprobaron 320, 390 y 430 píxeles de teléfono, 768 de tableta, 1280 de escritorio y horizontal 844 × 390. El ancho interior de cada navegador puede descontar barras de desplazamiento.

En APR y OTROS el formulario usa el ancho disponible, sin desbordamiento horizontal. Se comprobaron el panel de usuarios, áreas y apariencia, edición de registros, lectura de fichas, configuración de fotografías, guardado de texto multilínea con PNG y ampliación de la evidencia. Los controles de edición continuaron desactivados con permiso de consulta a tamaño de teléfono.

Pasaron los diez conjuntos de pruebas funcionales existentes. Se mantuvieron las 86 huellas locales de v238 y las 83 de las bases protegidas.

## Alcance pendiente

Las pruebas de presentación se realizaron en el navegador integrado ajustando tamaños; falta la revisión en dispositivos físicos iOS/Android. El visor PDF nativo del navegador integrado conserva la limitación documentada previamente; la descarga y los documentos PDF fueron verificados.

La copia adaptada se guarda sin desplegar. Publicar el enlace HTTPS de revisión sigue pendiente de autorización expresa; no se publica ni se modifica la aplicación oficial.
