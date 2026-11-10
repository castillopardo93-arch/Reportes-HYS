# Reportes HYS — contrato de investigación desde HSS-RGT-007 Rev. 08

**Fuente única acordada:** `HSS-RGT-007-Flash_Final Report rev.8.xlsx`.

## Reglas funcionales

- `Flash Report` y `Final Report` son documentos de un único expediente, correlativo global compartido; versiones y revisores independientes.
- `Guardar borrador` admite campos vacíos y varios expedientes simultáneos.
- `Enviar Flash a revisión` solo se permite con los antecedentes mínimos completos. Presentar resumen de faltantes y resaltar casillas incompletas sin eliminar contenido.
- `Final Report` permanece bloqueado durante los borradores incompletos o completos que no hayan sido enviados. Se puede comenzar a elaborar desde el primer envío válido de Flash, sin esperar su aprobación.
- Si Flash se devuelve para corregir, Final puede conservar su borrador, con alerta cuando el Flash cambia. La aprobación definitiva de Final requiere Flash aprobado.
- Toda intervención genera evento auditable: quién, cuándo, antes/después, observaciones, asignación, revisión y aprobación.
- `Seguimiento Flash` debe mostrar responsable actual y cantidad de campos pendientes.
- Los nombres de campos, listas de validación, códigos de causas y descripciones se leerán del MISMO archivo Excel; no introducir etiquetas o causas inventadas.

## Reglas mínimas de validación del laboratorio v308

Por ahora, para enviar Flash se exigen: tipo de incidente, probabilidad, fecha, hora, área, ubicación, nombre y cargo del involucrado, respuestas de primeros auxilios, ambulancia, hospital y testigos, relato de hechos, causas aparentes, acciones inmediatas, persona que reporta y persona que prepara. Las descripciones mínimas deben tener longitud suficiente; no se pide RUT para la simulación.

**Estas reglas son provisionales.** Los campos obligatorios definitivos, condiciones, excepciones y valores de listas deberán cotejarse con la plantilla Excel original y las reglas operativas de HYS antes de habilitar informes reales.

## Integración definitiva del mismo Excel

1. Incorporar el libro una sola vez a un repositorio privado autorizado, conservar original y versión/hash.
2. Mapear hojas `Flash Report`, `Final Report`, `Lista` y `Tabla`, con coordenadas de celda, validaciones, opciones y descripciones exactas.
3. Exponer los catálogos precargados al usuario sin cargar archivos manualmente. La carga de la hoja `Tabla` desde Final Report actualmente solo es provisional.
4. Persistir expedientes, revisiones, eventos y archivos con roles/RLS y trazabilidad en un backend autorizado.
5. Generar un XLSX rellenado como copia de la plantilla maestra, manteniendo su estructura de impresión, y exportar un PDF generado desde esa copia. Comparar ambas salidas con la plantilla fuente.
6. Probar roles de distintos usuarios, alteraciones durante revisión, permisos, historial y documentos, antes de publicar.

## Seguridad de v308

- El flujo de ensayo usa solo memoria; se pierde al recargar. Los números `SIM-` NO son correlativos oficiales.
- Los usuarios de demo no son perfiles reales. No introducir incidentes reales, RUT, declaraciones ni fotos personales.
- Sin escrituras en Supabase ni publicación de producción; rama `main` y versiones previas intactas.
- La plantilla original figura en Library, pero la sesión no ha permitido extraer sus bytes; pendiente de incorporar/inspeccionar el libro real antes de reemplazar los catálogos provisionales.
