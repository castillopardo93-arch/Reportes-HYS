# Reportes HYS v294 — Validación del archivo PDF y permisos por tarjeta

**Fecha:** 9 de noviembre de 2026  
**Base:** `desarrollo/v293-archivo-pdf-evidencias` (0e203c10b49e970451a2be870d53219a525c074e)  
**Rama de trabajo:** `desarrollo/v294-validacion-historial-pdf-dos-tarjetas`

## Desviaciones confirmadas y corregidas

1. La RPC de Supabase `hys242_cargar_informe(p_pdf=false)` devuelve `archivo=null`; el cliente podía guardar esta respuesta incompleta en el archivo local y perder un PDF o historial previamente conservado. Ahora la consulta de solo datos **no actualiza** la copia PDF local.
2. Se validan identidad, módulo, revisión, autor, estado y estructura del informe antes de utilizar una respuesta central. Esto evita incorporar por error datos de otra tarjeta.
3. Solo se archiva un PDF remoto cuando existe archivo en Base64 con encabezado PDF y el metadato corresponde al informe solicitado.
4. Los informes exclusivamente locales se leen localmente aunque existan conexiones remotas habilitadas para otros registros.
5. Se protegen las operaciones asíncronas frente a cambios de sesión o tarjeta.
6. La tarjeta OTROS rechaza contenido de Actividades HYS/Actividades por área propio de APR; conserva únicamente hallazgos.

## Validación

- `evidencias-v294/test-validacion-dos-modulos-v294.cjs` comprueba ambos módulos mediante respuestas simuladas del servidor; incluye una ejecución aislada de la función real `fetchReport` y del acceso a archivos locales.
- GitHub Actions ejecuta también regresiones v293, v292, v291, v290, v289 y v284.
- Los PDF y fotografías se ensayan como datos sintéticos. No se usaron cuentas reales.

## Matriz pendiente de verificación real en Work

| Caso | Prevencionistas | Supervisores/Capataces | Evidencia requerida |
|---|---|---|---|
| Ingresar con cuenta autorizada | Pendiente | Pendiente | Captura de tarjeta y permisos |
| Subir JPG/PNG y generar PDF | Pendiente | Pendiente | PDF con fotografía legible |
| Crear hallazgo y finalizar | Pendiente | Pendiente | Informe archivado y descargable |
| Editar borrador con motivo | Pendiente | Pendiente | Historial antes/después |
| Recuperar en segundo dispositivo | Pendiente | Pendiente | Comparación de ID/revisión |
| Probar acceso a informe ajeno | Pendiente | Pendiente | Rechazo permitido por RLS |
| Desactivar permiso y reintentar | Pendiente | Pendiente | Revocación efectiva |
| Intentar cargar registros de otro módulo | Pendiente | Pendiente | Rechazo y conservación de datos |
| Confirmar PDF sin duplicar archivos | Pendiente | Pendiente | Igual identificador y revisión |
| Restablecer sesión en medio de operación | Pendiente | Pendiente | Ninguna escritura fuera de ámbito |

**Importante:** la v294 es de desarrollo y no certifica pruebas autenticadas entre dispositivos. El despliegue de Supabase, activación de escritura central y publicación de la aplicación siguen requiriendo autorización específica. No se alteraron `main`, el sistema oficial ni versiones aprobadas.
