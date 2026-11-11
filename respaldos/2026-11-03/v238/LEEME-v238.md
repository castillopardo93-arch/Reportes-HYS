# Reportes HYS v238 — Desarrollo independiente

Base: copia v237. Fecha de trabajo: 3 de noviembre de 2026, Chile.

## Cambios
- Corregida la variable fuera de alcance que interrumpía el cambio de pestaña. APR «Informe diario» y OTROS «Hallazgos» ahora tienen marca activa y aria-current.
- Rótulos visibles actualizados a v238. Se mantienen los identificadores compatibles de datos dentro de un espacio local exclusivo de v238.
- Retirados interfaz, OAuth y sincronización con Google Drive.
- Supabase central: informes_v238 (datos, adjuntos y PDF), listas_v238, areas_trabajo_v238 y auditoria_areas_v238. La tabla areas original sigue representando APR/OTROS y no se modifica.
- Borradores y cola de cambios protegidos en IndexedDB, separados por usuario/módulo; reintento, tokens idempotentes y detección de conflictos por revisión. Los conflictos pueden descargarse y conservarse como informes nuevos.
- Responsable desde perfiles.nombre. Usuarios, supervisores y administradores de área no pueden editarlo; global dispone de campo de texto. El servidor conserva creador y último actor reales desde Auth.
- Administración central de opciones exclusiva de global; gestión e historial de áreas para global, administradores de área y supervisores dentro de sus módulos. No se restauró la tarjeta de listas en Configuración.
- Duplicados de áreas y opciones controlados por índice normalizado. Desactivación/reactivación; valores anteriores conservados en informes y al editar registros históricos.
- Auditoría por trigger transaccional en Supabase, sin permisos de inserción/modificación/eliminación desde la app. Registra actor, rol, módulo, fecha, acción, anterior y nuevo. Las 22 áreas iniciales llevan actor de sistema «Inicialización v238».
- Se conservan fotografías, ampliación, configuración de fotos, generación PDF y Reportes Anteriores. Copia local y central del PDF usan el mismo identificador para evitar duplicados.
- La generación PDF exige los siete campos de Inicio completos y fecha desde no posterior a fecha hasta.

## Pruebas
- 38 pruebas de autenticación simulada y 20 de administración simulada.
- 6 pruebas de cola: desconexión, reintento con el mismo token, recarga, cambios durante envío, conflictos y aislamiento.
- 9 comprobaciones de validación de Inicio para PDF.
- Flujos de PDF APR/OTROS aprobados. Tres PDFs reales de 6, 5 y 6 páginas: 42, 30 y 16 fotografías, márgenes y ausencia de superposiciones comprobados. Un caso extremo de texto genera la advertencia de continuación prevista por el motor.
- Navegador local con datos simulados: pestañas activas APR/OTROS, responsable de usuario bloqueado y global editable, creación de hallazgo, fotografía y ampliación, vista previa y descarga PDF tras completar Inicio, consulta de Reportes Anteriores; supervisor simulado con administración de áreas e historial, sin administración de opciones.
- PDF y fotografía guardados y recuperados en la base real bajo RLS, dentro de una transacción revertida.
- Base real, transacción revertida: global, usuario y administrador de área; crear/renombrar/desactivar/reactivar áreas; 4 auditorías con valores anteriores/nuevos; duplicados; historial inmutable; rechazo a modificar catálogos sin permisos y a editar informe ajeno; identidad del actor, conflictos e idempotencia.
- Comparación con respaldo previo: 7 perfiles, 8 permisos y 2 áreas de módulos intactos. Cero informes de QA residuales. Solo nuevas tablas de v238 y 22 áreas iniciales (11 por módulo).

## Respaldo y migración
El respaldo de los datos públicos previos, políticas y funciones está en desarrollo/respaldo-supabase-previo.json, excluido del alojamiento y del repositorio de prueba. No contiene contraseñas ni tokens de usuarios.
Las once áreas conocidas fueron inicializadas en APR y OTROS. No existían tablas centrales de informes en la base inspeccionada.
Los informes, fotos y listas personalizados que permanezcan en navegadores de v237 no están incluidos en el ZIP de código y no son accesibles desde otro origen HTTPS. Se mantienen intactos. Antes de transferirlos: exportar JSON desde la versión original, conservarlo como respaldo, revisar las opciones personalizadas con global e importar una copia en v238 dentro del módulo y usuario correctos. No se ha hecho una migración masiva de esos datos locales ni se afirma que hayan sido transferidos.
Un PDF antiguo sin datos estructurados debe conservarse como archivo; no se reconstruye un formulario a partir de ese PDF.

## Límites y pendientes
- Falta una prueba de inicio de sesión HTTPS con las credenciales reales del usuario, sin que el agente conozca la contraseña.
- No existe un perfil supervisor en la base actual. Su regla de servidor está implementada junto con la de administrador de área; falta prueba real con un supervisor autorizado, sin cambiar usuarios existentes.
- La recuperación de contraseña sigue sujeta a los límites/envíos de Supabase y a su lista de URLs de retorno. No se cambió la configuración global de Auth.
- La administración de usuarios heredada conserva su función y modo de consulta; su servidor puede rechazar el nuevo origen HTTPS por CORS. No se alteró esa función ni sus secretos.
- Los avisos previos de Supabase sobre rls_auto_enable accesible y protección de contraseñas filtradas desactivada no se modificaron: afectan configuración preexistente. La RPC de informes v238 es SECURITY DEFINER por diseño, con permisos autenticados, search_path vacío y verificaciones explícitas.
- El navegador requiere conexión para cargar inicialmente las bibliotecas externas y autenticar/verificar permisos. Los cambios ya abiertos se conservan al interrumpirse Internet; no se promete inicio de sesión completamente offline.
- Adjuntos y PDF se guardan en JSONB dentro de Supabase. Archivos muy grandes pueden exceder los límites de petición o cuota; en ese caso quedan pendientes y disponibles localmente, con aviso para exportar una copia.
- No existe fusión automática de dos ediciones simultáneas: se detecta conflicto y se conserva una copia nueva.

## Protección
No se modificaron v232, v234, v235, v237, main/index.html ni la aplicación oficial. La base v236 y el ZIP v237 permanecen separados. Se comprueban hashes contra el inventario previo.
La copia HTTPS es un sitio nuevo, privado para el propietario, que añade la autenticación de Reportes HYS. No sustituye el sitio oficial.

Entrada local: index.html. Alojamiento: dist/ contiene únicamente HTML, JS y CSS de ejecución; no contiene respaldos personales, QA ni SQL.

La migración v238 ya se aplicó al proyecto inspeccionado. Los archivos SQL heredados son antecedentes; no ejecutar todas las migraciones del paquete sin revisar su propósito.

