# Reportes HYS — Corrección de auditoría integral, v297

**Fecha:** 9 de noviembre de 2026  
**Rama:** `desarrollo/v297-auditoria-sincronizacion-trazabilidad`  
**Base aislada:** `desarrollo/v296-integridad-local-documental` — commit `7ee7e3196d17ab04f363e5b2d4482ad9ae6a9ad9`  
**Origen:** Auditoría integral v296 (AUD-296-01, 02, 03, 04)

## Correcciones verificables en desarrollo

1. **AUD-296-01 | Alta:** `verifyServerAck` coteja identidad, revisión, contenido persistido e igualdad del PDF solicitado, aunque el servidor devuelva exactamente el mismo token. Se contempla únicamente la transformación documentada por la función SQL: `archivo.metadata.reportData` se normaliza al `payload` persistido. Una diferencia retiene el pendiente.
2. **AUD-296-02 | Alta:** `Queue242.run` salta documentos cuya copia necesita un PDF nuevo, los conserva y procesa los demás informes en orden de incorporación. Devuelve conteo de bloqueos y pendientes para mostrar advertencia, no falsa sincronización.
3. **AUD-296-03 | Alta:** se añade `historyFingerprint` independiente de la huella de campos del formulario. Toda respuesta remota debe demostrar el historial solicitado; de otro modo se rechaza con `HYS_HISTORY_NOT_PERSISTED`. Los metadatos confirmados conservan ambas huellas.
4. **AUD-296-04 | Media:** `planConflictCopies` cuenta cada informe con `needsPdf`, incluso si era `Finalizado` pero no tenía archivo. Se permite sincronizar operaciones independientes mientras el PDF pendiente se conserva.

## Límite crítico conocido: contrato actual del servidor

La inspección **de solo lectura** de `public.hys242_guardar_informe` confirmó que compara `p_payload` excluyendo `history` al determinar si existieron cambios. Por tanto, una edición exclusivamente del historial puede ser devuelta como un no-op sin persistirse. **Esta versión corrige el lado cliente sin falsificar una confirmación.** La modificación del contrato SQL, migración, autorizaciones y pruebas negativas quedan reservadas para Work. Hasta entonces estas operaciones pueden permanecer en cola de forma deliberada.

## Alcance y regresiones

- Nuevo conjunto: `evidencias-v297/test-acuses-trazabilidad-v297.cjs`.
- Regresiones heredadas: v296, v295, v294, v293, v292, v291, v290, v289 y v284.
- Ninguna modificación a Supabase, producción, `main`, ni versiones protegidas.
- Bandera triple de escritura central continúa desactivada.
- No hay prueba E2E autenticada: este cierre corresponde únicamente al desarrollo y pruebas simuladas.

## Criterios de aceptación

- Mismo token y diferente payload o PDF: retener operación pendiente.
- Diferencia únicamente en `history` con el mismo token o token previo: retener pendiente.
- Bloqueo de PDF del primer informe no impide enviar un segundo informe independiente.
- Un informe finalizado sin archivo cuenta como un PDF a regenerar.
- Cualquier error mantiene la operación original y no informa sincronización completada.
