# Reportes HYS · v296 · Correcciones de auditoría integral de código

**Fecha:** 9 de noviembre de 2026  
**Base protegida:** `desarrollo/v295-recuperacion-conflictos-pdf-seguro`  
**Copia aislada:** `desarrollo/v296-integridad-local-documental`  
**Auditoría de origen:** AUD-COD-HYS-2026-11-09-01  
**Estado:** desarrollo, NO publicado ni habilitado para escrituras centrales.

## Matriz de correcciones

| ID | Prioridad | Resultado aplicado | Limitación |
|---|---|---|---|
| A-01 | Alta | Copia de conflicto con PDF antiguo o estado Finalizado pasa a En edición y conserva `requiresPdfRegeneration`. La cola no puede enviar antes de incorporar PDF nuevo. El original permanece como recuperación. | Verificar en navegador con flujo PDF real |
| A-02 | Alta | Validación estricta de ID del archivo, ID del formulario y módulo ANTES de reemplazar datos locales. | Respaldos históricos inconsistentes se rechazan, requieren evaluación manual |
| A-03 | Alta | Comprobación Base64, firma, metadatos, startxref/xref y EOF antes de cachear PDF remoto. | No reemplaza un parser PDF completo |
| A-04 | Media | Firmas binarias para JPEG/PNG/GIF/WEBP/BMP, además de sintaxis Base64. | No garantiza decodificación raster; comprobar imágenes reales |
| A-05 | Media | Todos los JS/CSS locales referenciados utilizan `?build=v296-integridad-09nov`. | En el despliegue confirmar política cache HTTP |
| A-06 | Media | Guardado asíncrono devuelve false si cambia de sesión antes de confirmar. | Persistencia ya empezada puede terminar en el ámbito antiguo, aislado |
| A-07 | Media | El mensaje no confunde cola vacía con respaldo guardado. | Confirmación central continúa desactivada |
| A-08 | Media | Fallback de almacenamiento no escribe sin API Navigator Locks. | En esos navegadores solicitar copia JSON; aún faltan pruebas con 2 pestañas reales |
| A-09 | Media | Cierre de la conexión IndexedDB del archivo PDF garantizado con `finally`. | Ejecución de errores reales de navegador pendiente |
| A-10 | Media | No modificado, porque fijar SRI requiere verificar los binarios exactos de proveedores CDN. | Pendiente de revisión de distribución |
| A-11 | Baja | Se incorporó un módulo aislado para identidad; refactorizar el HTML completo queda pospuesto. | Evitar modificar interfaz protegida sin pruebas visuales |

## Evidencias automatizadas

- `evidencias-v296/test-integridad-auditoria-v296.cjs`: 34 controles sintéticos nuevos.
- Regresiones conservadas: 27 pruebas v295, 30 v294, 32 v293, 26 v292, 27 v291, 17 v290, 43 v289 y 16 v284.
- **252 verificaciones automatizadas en total** cuando la ejecución completa finalice con éxito.
- Workflow: `.github/workflows/qa-v296-integridad-local.yml`.

## Lo que NO fue modificado

- `main`, la aplicación publicada, Supabase, Auth, funciones RPC, datos reales, permisos de producción o cualquier versión anterior.
- Catálogo Maestro Oficial de Riesgos, Formulario PDF de Actualización, Control Integral HYS ni sus documentos oficiales.
- No se activaron `HYS242_ENABLE_CENTRAL`, `HYS242_DEPLOYMENT_READY` o `HYS292_REMOTE_WRITE_AUTHORIZED`.

## Condiciones para Work

1. Ejecutar pruebas E2E en ambos módulos con usuarios autorizados y respaldos sintéticos, evitando escrituras sobre informes reales.
2. Generar/abrir/descargar PDF con imágenes auténticas y verificar reconocimiento estructural en navegador.
3. Probar corrupción de respaldo y dos pestañas simultáneas con IndexedDB deshabilitado.
4. Verificar caché HTTP y recursos CDN; si se incorpora SRI, calcularlo con los archivos exactos distribuidos.
5. Integrar catálogos oficiales, usuarios/facultades y datos centrales solo con autorización explícita.
6. No publicar sin registro de aprobación y respaldo de retorno.
