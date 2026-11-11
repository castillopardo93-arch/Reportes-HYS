# Reportes HYS v299 — Lectura remota robusta y segura

**Fecha:** 9 de noviembre de 2026.  
**Rama:** `desarrollo/v299-lecturas-historial-por-modulo`.  
**Base:** `desarrollo/v298-lectura-central-autenticada` (67a581da12d7b129732dbbf3fa04b23a6787b175).

## Defectos corregidos

1. **Edición aparente de informes centrales:** v298 permitía cargar un informe descargado desde Supabase en el editor local, a pesar de que el guardado central está deshabilitado. Esto generaba la impresión de que el informe central había sido corregido. En v299 los informes `remote:true` no se cargan al editor cuando `central()===false` y el botón queda rotulado como solo lectura.
2. **Índice central sin validación:** v298 aceptaba cualquier lista de filas de `hys242_consultar_informes` y las incorporaba al historial local. La política pura `read-policy-v299.js` rechaza identificadores incorrectos, módulos distintos, revisiones inválidas, PDF sin indicador booleano, duplicados, más de 20 filas y metadatos complejos inesperados. Los campos adicionales quedan fuera del resumen.
3. **Consultas simultáneas y paginación:** al coincidir respuestas asíncronas de Historial y Comprobar lectura, podía repetirse o saltarse página. Ahora las solicitudes en curso se comparten por sesión y tarjeta y la página solo avanza tras archivar correctamente la respuesta validada.
4. **Cambio de usuario o tarjeta:** se reinicia `reportPage`, el estado de solicitud remota y los indicadores de lectura anteriores. Los permisos y el ámbito se revalidan durante cada operación.
5. **Caché del navegador:** los recursos JS/CSS locales usan una nueva etiqueta de compilación `v299-central-read-09nov`.

## Qué permanece sin cambios
- La autenticación real usa Supabase Auth y `hys242_contexto`; el servidor mantiene la autoridad de permisos.
- La consulta central usa `hys242_consultar_informes` y `hys242_cargar_informe` en modo solo lectura.
- **Ninguna escritura central habilitada.** Las tres banderas permanecen en `false`.
- No se aplicaron migraciones SQL, funciones Edge, cambios de usuarios, configuración de publicación ni despliegues.

## Evidencias
- Pruebas nuevas en `evidencias-v299/test-lectura-remota-v299.cjs`.
- Regresiones v298 a v284 mediante `.github/workflows/qa-v299-lectura-remota.yml`.

## Pendiente de verificación real
Inicio de sesión autenticado en navegador, apertura de ambas tarjetas según permisos, listado de informes con registros reales, recuperación de PDF con RLS y prueba entre dispositivos. La versión sigue siendo de **desarrollo y no publicada**.
