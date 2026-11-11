# Reportes HYS — C08: Acciones individuales por responsable

**Fecha:** 2026-11-05. **Rama:** `desarrollo/v243`. **Publicación:** no realizada. **Estado:** contrato e interfaz preparados, pendientes de pruebas visuales y autorización real de backend.

## Propósito

Vincular varias acciones a un hallazgo y permitir que cada responsable gestione *su propia acción* sin modificar la de otros. Un hallazgo con varias personas **no podrá cerrarse globalmente mientras exista cualquier acción obligatoria pendiente o sin verificación de evidencias**.

## Modelo propuesto, compatible con C01–C07

- Se conserva el registro original: columnas/valores `0..4`, fotografías `5`, metadatos `6`.
- Dentro de `record[6].actions`, cada tarea contiene `actionId` (UUID), `assigneeId` (UUID de responsable), `assigneeName` (nombre legible de referencia), `description`, `required` (booleano) y `status`.
- Las nuevas tareas solo se crean con `status: 'pending'`. El formulario no puede fabricar tareas verificadas.
- Estados reconocidos para leer estados procedentes del servidor: `pending`, `in_progress`, `submitted`, `verified`, `rejected`. El usuario **no puede fijar un estado manualmente**.
- Solo se considera `verified` auténtico si consta también `verifiedAt` (fecha), `verifiedBy` (UUID) y al menos un `evidenceId` (UUID). **El servidor debe volver a comprobar** identidad, documentos, ámbito y autenticidad de esos metadatos.
- No se cambian ni suprimen tareas históricas desde el editor; solo se pueden quitar borradores nuevos no guardados. Las tareas con datos antiguos inválidos bloquean guardado hasta revisión, evitando borrado silencioso.

## Interfaz desarrollada

En el formulario de Hallazgos de APR y OTROS se incluye la sección **Acciones individuales por responsable** para planificar tareas con descripción, responsable y obligatoriedad. Solo permite seleccionar UUID entre los responsables vinculados al hallazgo. La sección de Seguimiento contiene una lista individual de tareas y un formulario de evidencia para las tareas que pertenecen al usuario autenticado.

Las operaciones de envío están **inhabilitadas por defecto**. Se activarán exclusivamente al existir un servicio de ensayo aislado con autenticación, autorización y auditoría verificadas; no basta con cambiar un indicador del navegador.

## Seguridad y condición de cierre

- Un responsable solo puede presentar evidencia por su propio `actionId`, verificado por UUID y ámbito APR/OTROS. El servidor debe revalidar esta regla, pues no se confía en JavaScript.
- Toda tarea obligatoria debe estar **verificada**, no simplemente «Completada» o «Enviada», con evidencia y verificador registrados.
- En grupos con varios responsables, cada responsable debe tener al menos una acción obligatoria verificada. Las tareas opcionales no bloquean el cierre si las obligatorias cumplen el requisito.
- Las tareas sin UUID válido, sin responsable vigente, duplicadas o con estado desconocido impiden considerar el hallazgo listo para cerrar.
- La corrección general de C07 se bloquea en hallazgos con varios responsables para impedir que un actor sustituya sus acciones individuales. El cierre global permanece reservado para un procedimiento posterior con revisión y auditoría (C09), incluso si las tareas ya están verificadas.
- Los recibos de envío deberán incluir evento y revisión de servidor; una consulta posterior deberá confirmar exactamente esos identificadores antes de dar el envío por verificado. La operación debe ser idempotente para evitar duplicados.
- El servidor deberá validar las fotografías JPG/PNG/WebP, límites de archivos, permisos, versión de hallazgo y evidencia antes de aceptar una acción.

## Dependencias no resueltas

1. C04: servicio aislado de lectura de usuarios activos y ámbitos autorizados. Sin él no se pueden crear nuevas asignaciones reales.
2. C07: servicio aislado de evidencias, corrección/cierre, versionado y auditoría.
3. C08: fuente de datos y autorizaciones remotas de acciones individuales; ninguna cuenta real fue consultada ni modificada.
4. C09: cierre global, verificación independiente, reapertura y auditoría permanente.
5. F01–F07: avisos internos/correo a los responsables.

El sitio v243 sigue marcado como NO PUBLICABLE y con `HYS242_ENABLE_CENTRAL=false`, `HYS242_DEPLOYMENT_READY=false`. No se ha escrito en Supabase.

## Archivos
- `v243/actions-v243.js`: planificación, validación de acciones, filtro por responsable, estado de verificación y servicio independiente bloqueado.
- `v243/actions-v243.css`: interfaz responsive para acciones por persona.
- `v243/index.html`: integra selector en el modal y conserva `actions` en metadatos.
- `v243/finding-detail-v243.js`: presenta lista de tareas en Seguimiento.
- `v243/corrections-v243.js`: endurece las reglas de cierre C07 y bloquea correcciones generales con varios responsables.
- `v243/test-c08-v243.cjs`: 25 casos con datos sintéticos.
- `v243/test-c07-v243.cjs`: adapta la expectativa heredada: estado `completed` por sí solo **no** significa verificado.

## Validaciones pendientes
Ejecución nativa de Node, navegación en escritorio/móvil, fotografías en PDF, flujos APR/OTROS, cambios de asignación y de tareas, evidencia real en servidor de ensayo y matriz de seguridad de usuarios. Enlace de revisión web después de C10, si se puede habilitar un entorno aislado y seguro.

---

## C08-R — Reasignación por renuncia, desvinculación o ausencia (aprobado por el usuario)

Se incorpora como **requisito obligatorio**, no como acción automática. Cuando una persona renuncie, sea desvinculada, trasladada o permanezca ausente un período prolongado, sus acciones **pendientes, en proceso o devueltas** podrán solicitarse para reasignación por un supervisor o administrador autorizado del **mismo ámbito**. Las acciones ya verificadas no se transfieren: conservan evidencia y autoría histórica. Las acciones enviadas a verificación se revisarán antes de transferirlas.

**Regla de control:** supervisor y administrador de área únicamente en su ámbito autorizado; administrador global según permisos del proyecto. El usuario común no puede reasignar. La autenticación, el estado activo, la pertenencia al proyecto/área/módulo y la capacidad de reasignación se verifican **en el servidor**.

El trabajador saliente debe quedar **inactivo, no borrado**. Cada acción transferida conserva un registro permanente con `actionId`, UUID/nombre anteriores, UUID/nombre nuevos, actor que reasignó, rol/ámbito, motivo, justificación, fecha/hora de servidor, revisión previa y nueva, estado inicial y final, y referencia de evento de auditoría. Nunca se marca como verificada una tarea por renuncia/desvinculación.

**Flujo de preparación en v243:** panel de consulta de candidatos dentro de Seguimiento; solo consulta un proveedor aislado, no muestra cuentas de otras áreas/proyectos y guarda un recibo **solo de forma remota**. Sin proveedor autenticado y verificado, todas las acciones quedan bloqueadas. No se concede autorización por controles de JavaScript.

**Regla C09 asociada:** el cierre global solo procede después de una verificación de acciones obligatorias, evidencias y auditoría con el responsable vigente. Si existía evidencia aportada por un trabajador saliente, el supervisor autorizado puede revisarla y verificarla sin atribuir su autoría al reemplazante; si falta evidencia, se reasigna la ejecución. La reasignación no otorga automáticamente permiso de cierre.

Pruebas adicionales: `test-c08-reassignment-v243.cjs`, más las pruebas de C08 y C09. El backend real, los permisos y la auditoría se desarrollarán y validarán exclusivamente en un entorno aislado con aprobación posterior.
