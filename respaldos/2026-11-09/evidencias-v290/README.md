# Reportes HYS · Desarrollo v290 · Riesgos por nombre oficial
Fecha: 2026-11-09. Base: desarrollo/v289-auditoria-integral-consolidacion (5b88f0e6bfa3e7ef7fb74bc1f774b7098a2a0a6f).

## Objetivo
Adecuar la visualización del selector de Hallazgos a los documentos oficiales del catálogo maestro: mostrar solo la **denominación vigente**, sin códigos R0001/R0002 en la interfaz ni en el detalle y resumen de riesgos seleccionados.

## Cambios acotados
- Ocultar códigos heredados en chips, búsqueda visible, resumen y fila de riesgos asociados.
- Mantener `code` internamente en instantáneas de informe y semilla de 393 riesgos para compatibilidad con informes anteriores.
- Mantener búsqueda tolerante por nombre, alias o código histórico sin presentar el código al usuario.
- Identificar el botón heredado de JSON/CSV como **carga local**; no representa sincronización oficial.

## Límites y tareas para Work
- No se ha importado ni publicado el Excel oficial. Los archivos oficiales permanecen independientes.
- La importación heredada requiere código interno: NO interpreta directamente el Excel oficial sin códigos ni el formulario PDF.
- Diseñar una migración con identificador técnico estable no visible y mapeo por nombre + equivalencias, con auditoría de altas, ediciones y desactivaciones.
- Validar duplicados, cambios de nombres, alias ambiguos, vínculos históricos y respaldo/reversión antes de activar la escritura central.
- No tocar Supabase, main, versiones aprobadas ni aplicación oficial.
- Pendientes: prueba visual real con roles y registros, integración backend, permisos y pruebas E2E.

## Criterios de aceptación
1. Ningún código R#### visible en la búsqueda, selección o detalle de riesgos.
2. Los informes legados mantienen el mismo código interno y nombre asociado.
3. La búsqueda por alias y códigos antiguos continúa encontrando el riesgo correcto.
4. La carga JSON/CSV local no se confunde con actualización central del catálogo.
5. El selector de ambas tarjetas muestra nombres coherentes, sin cambiar los demás formularios.
6. Pruebas v290 y regresiones de v289/v284 aprobadas antes de revisión de usuario.

## Evidencias
`evidencias-v290/test-riesgos-v290.cjs` y workflow `.github/workflows/qa-v290-riesgos.yml`.
