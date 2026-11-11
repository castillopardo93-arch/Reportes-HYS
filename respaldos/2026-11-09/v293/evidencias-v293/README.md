# Reportes HYS v293 — Preservación de PDF y evidencias de respaldo

Fecha: 9 de noviembre de 2026.
Base: desarrollo/v292-integracion-guardado-controlado (03a87cbf77015aaeb091d2e4794896343a68ef67).
Rama de trabajo: desarrollo/v293-archivo-pdf-evidencias.

## Hallazgos corregidos
1. La recepción de un resumen de revisión remota más nueva podía sustituir el archivo local completo por metadatos sin PDF ni formulario editable.
2. La vista de Reportes anteriores permitía intentar descargar informes sin PDF local ni ruta central habilitada.
3. La consulta de archivo seguía utilizando solo dos controles de autorización remota, ignorando la tercera bandera de v292.
4. La importación de fotografías aceptaba cualquier MIME en formato data URI, incluidos formatos de imagen no compatibles con el generador PDF.

## Correcciones
- `archive-policy-v293.js` define la disponibilidad real de evidencia en caché o servidor y fusiona resúmenes sin descartar contenido antiguo.
- Si se detecta una nueva revisión central, la revisión local anterior permanece intacta, identificada como copia local con revisión remota pendiente.
- Los botones para consultar PDF o editar reflejan los documentos efectivamente recuperables y la sesión autorizada.
- El lector remoto utiliza también la tercera puerta de v292.
- Las imágenes en respaldos deben ser JPG, PNG, GIF, WEBP o BMP y tener base64 válido dentro de un límite definido; SVG y texto incrustado no son fotografías admitidas.
- Se valida el formulario antes de archivar un PDF para no registrar silenciosamente un informe con fotografías inválidas.

## Estado del ambiente
- v293 es copia aislada. v292 y versiones anteriores siguen intactas.
- `main`, app oficial y Supabase no se modificaron.
- La base central NO fue activada; todas las pruebas son simuladas/locales.
- No se realizaron pruebas reales entre dos dispositivos o cuentas autenticadas, que requieren sesiones autorizadas en Work.
- Aún no se integran los dos formatos documentales oficiales.

## Evidencia
- `evidencias-v293/test-archivo-evidencias-v293.cjs`.
- `.github/workflows/qa-v293-archivo-evidencias.yml` repite también pruebas v292, v291, v290, v289 y v284.

## Criterios pendientes
Prueba visual real de PDF y fotografías en Prevencionistas y Supervisores/Capataces, recuperación entre dos sesiones, RLS efectiva, diferencia entre revisión local y remota, y autorización específica antes de habilitar escrituras centrales.
