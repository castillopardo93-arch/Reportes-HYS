# Reportes HYS v312 — revisión correctiva aislada

Base inalterada: v311 (commit `0a4896da75050f1ca21be9df40ec54712d9029da`). Rama de trabajo: `desarrollo/v312-auditoria-correctiva`. No se modifican `main`, v311 ni producción.

## Cambios de esta versión
- Límite de 40 planes al crear, reabrir y modificar Final Report.
- El buscador de revisores respeta el bloqueo de documentos de solo lectura; no hereda destinatarios de otro expediente.
- El Final basado en una revisión anterior de Flash no puede reenviarse sin corregir y documentar sus antecedentes.
- El laboratorio informa que no conserva archivos adjuntos; rechaza guardados que generarían falsa expectativa de almacenamiento, y advierte antes de salir con adjuntos temporales.
- Al limpiar el formulario desaparecen los avisos rojos de la revisión anterior.
- Se corrigen indicaciones obsoletas del catálogo, que ya contiene 153 códigos y nombres de causas asociados al punto 9. El punto 10 mantiene CÓDIGOS de texto libre.
- Se mantiene el diseño de facultades de Administrador con dos autorizaciones de cierre en la lista original; no se instala panel paralelo.

## Validación
La suite `.github/workflows/qa-v312-investigacion.yml` incluye pruebas v311 heredadas (adaptadas a la carpeta aislada) y casos v312 para adjuntos, límite de planes, reasignaciones y bloqueo de revisores.

**No publicar.** Flash/Final operan exclusivamente en laboratorio sin guardado real. Pendientes: backend de expedientes, trazabilidad RLS, adjuntos, notificaciones, firma, autorizaciones de cierre en servidor y validación H&S de criterios mínimos. No incorporar datos personales ni incidentes reales.
