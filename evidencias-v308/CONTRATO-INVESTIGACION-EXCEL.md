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

## Corrección de interfaz — carga directa del catálogo (10/11/2026)

Se elimina la opción `Cargar listas de causas desde Excel` del formulario. La fuente de verdad será un fichero de catálogo preintegrado, generado por la herramienta `extraer-causas-desde-excel.py` exclusivamente a partir del mismo HSS-RGT-007 Rev. 08.

No se debe dar por terminado el requisito «código + descripción directa» hasta que los 153 nombres reales hayan sido extraídos y verificados. Sin ese fichero, se deshabilitan los selectores de causas. El resto de las funciones de desarrollo v308 se conserva.

## Selección de revisores y autorización de cierre (10/11/2026)

- **Elaboración:** cualquier usuario activo puede crear Flash y guardar varios borradores.
- **Enviar a revisión:** control de búsqueda por nombre/apellido, selección de `usuario_id`, sin escritura libre como identidad de destinatario.
- **Directorio:** la sesión de Administrador General puede consultar los usuarios activos ya existentes mediante `hys242_listar_usuarios` (solo lectura). La consulta de nombres para usuarios básicos **no está habilitada** por el RLS actual de `perfiles`. Debe crearse posteriormente un servicio de directorio de mínimo privilegio que devuelva exclusivamente `usuario_id`, nombre, rol y facultades de revisión efectivas; no emails, RUT ni datos médicos.
- **Revisión y aprobación final:** son dos facultades independientes. Un revisor no adquiere facultad de cerrar por recibir un expediente.
- **Cierre Flash:** requiere estado válido, todas las observaciones resueltas y revisión/confirmación del aprobador final designado con facultad `aprobar_cerrar_flash`.
- **Cierre Final:** exige Flash aprobado, validaciones del Final completas, responsabilidades resueltas, y aprobador final designado con facultad `aprobar_cerrar_final`.
- El Administrador General establecerá **a quiénes** otorgar esas facultades; no serán facultades implícitas de un rol. Puede definir aprobadores diferentes por proyecto o área. Debe registrarse la persona autorizada, fecha-hora, decisión, versión aprobada, resolución de observaciones y cambios de responsables.
- En laboratorio de v308 se ensaya: Supervisor **solo revisa**, HYS **puede cerrar Flash** y Administrador **puede cerrar Final**. Es una configuración ficticia **no aprobada para producción**. El circuito real deberá basarse en facultades asignadas, no en nombres o roles inferidos.

**Estado v308:** búsqueda visual implementada; listado real completo y envío entre usuarios pendiente de directorio autorizado y persistencia central en Supabase. Sin cambios de base de datos ni usuarios reales.

## Facultades adicionales de cierre — v308 (10/11/2026)

- En el módulo `Gestión de usuarios → Permisos y facultades`, el Administrador General puede preparar **dos autorizaciones independientes** para usuarios activos: `cerrar_flash_report` y `cerrar_final_report`.
- Se permite seleccionar **uno o varios usuarios por facultad**; el mismo usuario puede tener ambas. No se exige rol Administrador: las facultades explícitas son independientes del rol ordinario y de las tarjetas APR/OTROS.
- Para cada tipo existe un **responsable sugerido** elegible solamente entre los usuarios marcados. El responsable concreto de un expediente se designará y auditará en el circuito de revisión de ese expediente.
- Cada propuesta muestra quiénes están seleccionados, cantidades por documento y los responsables sugeridos. Los cambios quedan temporalmente en memoria del navegador; pueden revisarse y descartarse, **no se guardan en Supabase** en esta etapa.
- En la **simulación v308**, seleccionar una facultad habilita el control de cierre para esa cuenta si recibió el documento; aprobar el propio informe como elaborador está bloqueado. El Final requiere Flash aprobado.
- En producción, cerrar exige autorización vigente verificada **en el servidor**, identidad autenticada, expediente asignado, estados válidos y bitácora de auditoría. Jamás confiar solo en un checkbox del frontend.
- Antes del guardado real se requerirán tablas/políticas RLS, eventos inalterables, revisión/versionado de facultades y una operación atómica en Supabase, con autorización expresa. La lectura actual de facultades APR/OTROS sigue intacta.
