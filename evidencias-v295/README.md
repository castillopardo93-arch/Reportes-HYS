# Reportes HYS — v295 | Recuperación de borradores, conflictos y PDF

**Fecha de desarrollo:** 09-11-2026  
**Rama:** `desarrollo/v295-recuperacion-conflictos-pdf-seguro`  
**Base:** `desarrollo/v294-validacion-historial-pdf-dos-tarjetas` (commit `95bdbe7f4d295122a6656e0f00cc96173caacbbb`)

## Hallazgos corregidos

1. Recuperación de borrador central marcaba `localSaved=true` y actualizaba estado aunque `loadReport()` devolviera `false` (cancelación, validación o protección de datos).
2. La creación de copias a partir de conflictos relabelaba `metadata.reportId` de un PDF ya generado sin reconstruir los bytes del PDF. Se podía producir un documento con identidad descoordinada.
3. La lectura asíncrona de PDF con FileReader no verificaba de nuevo el usuario, informe y permisos antes de escribir en la cola; tras cambios de sesión, podía persistir datos obsoletos.
4. El diálogo de copia de conflicto leía los pendientes antes de confirmar y no los revalidaba dentro de la transacción.

## Protecciones aplicadas

- Recuperación solo se declara exitosa cuando carga realmente el borrador.
- `onArchive` exige PDF no vacío tipo `application/pdf`; registra la sesión con Hys255Guard y la revalida tras la lectura asíncrona y el guardado.
- El nuevo módulo `recovery-policy-v295.js` prepara operaciones nuevas sin reutilizar PDF: `archive:null`, identidad y token nuevos, revisión inicial cero.
- Antes de retirar el pendiente original, guarda el registro completo, PDF histórico incluido si existe, como recuperación local persistente.
- Solo se actúa sobre operaciones asociadas al mismo usuario y tarjeta; se rechazan duplicados y registros con identificador inconsistente.
- Se relee la cola dentro de la transacción y se bloquean los cambios si se alteró la sesión.

## Pruebas

`evidencias-v295/test-recuperaciones-v295.cjs` y GitHub Actions `.github/workflows/qa-v295-recuperaciones.yml`.

Continúan ejecutándose todas las regresiones desde v284.

**Pendiente:** prueba en navegador con sesiones autenticadas y dos dispositivos, recuperación real de un PDF regenerado y comprobación RLS. No se cambiaron tablas, RPC, datos de Supabase, usuarios reales, main ni la app oficial. Escritos centrales desactivados.
