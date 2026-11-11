# Reportes HYS — Auditoría de regresiones v312

**Fecha:** 10-11-2026. Rama `desarrollo/v312-auditoria-correctiva`. Base v311 protegida y sin mutaciones.

## Hallazgos y acciones

| Hallazgo | Prioridad | Situación v311 | Solución v312 |
|---|---|---|---|
| AUD-312-01 | Media | El editor habilitaba «Agregar plan» aunque ya hubiera 40 filas restauradas | Respetar límite tanto al abrir como al agregar |
| AUD-312-02 | Alta | El cuadro buscador de revisor seguía escribible aun si el expediente estaba en revisión | Sincronizar bloqueo, deshabilitar entrada y resultados |
| AUD-312-03 | Media | Destinatario de revisión podía quedar seleccionado al cambiar expediente | Limpiar selección por formulario al abrir nueva investigación |
| AUD-312-04 | Alta | Un Final antiguo podía reenviarse sin actualizar sus datos tras corregir Flash | Impedir reenvío sin cambio documental; aprobación final sigue comparando revisiones |
| AUD-312-05 | Alta | Un borrador con archivo seleccionado aparentaba guardarlo, pero el archivo se pierde al recargar | Impedir ese guardado y comunicar que el adjunto solo existe temporalmente |
| AUD-312-06 | Baja | «Limpiar formulario» dejaba a la vista errores de validación previos | Borrar avisos y bordes de obligatoriedad |
| AUD-312-07 | Baja | Mensajes indicaban erróneamente que las causas seguían por integrar | Actualizar el texto sin tocar los 153 pares originales |

## Alcance y seguridad
Las correcciones afectan solo la copia `v312-review/`, el paquete de evidencias de v312 y un workflow QA específico. Se conservaron los nombres de archivos de módulos base, las dos facultades de cierre originales y los 153 códigos, sus descripciones y las cinco categorías.

**Limitaciones no resueltas:** pruebas de DOM no reemplazan la verificación visual real; falta persistencia y auditoría en Supabase, gestión de archivos y permisos de revisión/cierre en servidor. Las validaciones mínimas de Final son **provisionales** hasta aprobación de H&S.
