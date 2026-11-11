# Reportes HYS — C09: Auditoría, cierre formal y reapertura

**Fecha:** 2026-11-05 | **Rama:** `desarrollo/v243` | **Estado:** interfaz y contrato de seguridad incorporados; backend real NO habilitado. No es apto para publicación.

## Propósito
El historial de cada hallazgo debe informar **quién hizo qué, cuándo, con qué evidencia, a quién se reasignó y por qué**. Un estado visible `Completado` nunca equivale a cierre formal ni evidencia validada.

## Comportamiento incorporado en la copia de desarrollo
- En la pestaña **Historial / cierre** de cada hallazgo aparecen un área para **Consultar historial auditado**, un formulario **Solicitar cierre formal** y un formulario **Solicitar reapertura**. En ausencia del backend aislado los controles permanecen deshabilitados.
- La auditoría se solicita a un proveedor inyectable `listEvents` (solo lectura), pero **no se muestran eventos simulados ni registros locales atribuidos a un servidor**. Requiere respuesta `verified: true`, `source: "server"`, `module` correcto, `reportId`, `findingId` y revisión coherentes.
- Cada evento exige `eventId` UUID, `eventType`, `actorId`, nombre, rol, hora de servidor ISO, revisión ascendente, referencia de evento anterior y referencias opcionales de evidencias. Se muestran motivo y, en reasignaciones, nombre anterior/nuevo. La cadena se valida para detectar duplicados, cortes e inconsistencias **en pantalla**.
- Este chequeo de integridad en JavaScript **no equivale a criptografía ni garantiza inmutabilidad**. La verdad y la prohibición de alteraciones deben imponerse en el servidor, con tablas auditadas, permisos y transacciones.
- La solicitud de cierre formal está reservada preliminarmente a supervisor, administrador de área o administrador global autorizado; **requiere** ID de informe/hallazgo, revisión de servidor, tareas obligatorias verificadas con evidencia y **verificador distinto del ejecutor**.
- El cierre de un equipo de varios responsables debe continuar bloqueado mientras quede alguna acción obligatoria sin verificación del servidor. Un solo responsable sin tareas/evidencias verificadas tampoco obtiene un cierre formal.
- La reapertura solo es elegible para hallazgos con `closure.status: "closed"` y evento anterior `closure.eventId` UUID. Debe incluir motivo de 20–1500 caracteres, conservar el evento anterior e incorporar uno nuevo.
- El cliente **no escribe estados, auditorías, fotografías, usuarios ni cierres locales** desde C09. Tras `submit`, exige recibo `auditRecorded`, UUID del evento, nueva revisión y una segunda lectura `reload` que confirme la misma acción y estado. La idempotencia evita duplicar operaciones al reintentar.
- El historial requiere permiso del módulo y ámbito. La UI usa una comprobación adicional; la autorización real y los datos que se pueden consultar deben filtrarse siempre por proyecto, área y módulo **en el backend**.

## Reasignación por renuncia, desvinculación y ausencia
Quedan incorporados los requisitos aprobados de `C09-REQUISITOS-REASIGNACION-v243.md`:
- Mantener historial del responsable anterior, identificación del sucesor, actor autorizador, justificación y fecha de servidor.
- Reasignación no implica tarea completada ni evidencia de cierre.
- Las evidencias aportadas por la persona saliente conservan su autoría; las tareas verificadas no se transfieren automáticamente.
- Tras desactivación de usuario deberá existir una búsqueda automática de obligaciones abiertas y una alerta al supervisor/administrador autorizado, dentro de una implementación posterior segura.

## Implementación de backend requerida antes de activar C09
1. Backend y base de **ensayo aislados**, nunca Supabase productivo, con gestión de identidad, permisos efectivos por módulo/proyecto/área y perfiles activos.
2. Persistencia de hallazgos, acciones y evidencias con identificadores durables, control de versiones y revisión de conflictos. No depender del índice visual de fila.
3. Registro central **append-only**, transacciones indivisibles y permisos que impidan edición/eliminación de eventos: actor, rol, proyecto, área, módulo, hallazgo, acción, tipo, antes/después, motivo, fecha/hora de servidor, evidencia y cadena de reasignaciones.
4. Funciones de cierre y reapertura que comprueben **en servidor** todas las acciones obligatorias vigentes, evidencias reales, verificador independiente, ausencia de conflictos y permisos de cierre.
5. Respuesta verificable y relectura de operación con evento/revisión; idempotencia y rechazo de datos o eventos ajenos.
6. Lectura del historial filtrada por acceso real; administrador global ve el alcance completo de su organización, otros únicamente el suyo si está autorizado.
7. Auditoría de escenarios: renuncia/desvinculación, cambios de área/proyecto, usuarios inactivos, doble solicitud, acciones reasignadas, evidencia antigua, permisos revocados, cierre prematuro, reapertura, sincronización y usuarios con ambos módulos.

## Archivos de C09
- `audit-v243.js`: controles preliminares, panel, lectura verificable, validación de cadena, contratos de cierre y reapertura; sin red directa.
- `audit-v243.css`: historial y solicitudes adaptables, sin alterar tabla principal.
- `index.html`: registra recursos y contexto para auditoría sin tocar otros formularios.
- `finding-detail-v243.js`: presenta C09 exclusivamente en la pestaña Historial/cierre.
- `test-c09-v243.cjs`: 29 pruebas sintéticas de reglas y regresión.
- `test-c06-v243.cjs`: adapta expectativa del mensaje de historial a C09.

## Pendientes explícitos
No hay servicio aislado habilitado para leer o escribir auditorías reales. No existe evidencia verificable de un cierre o reapertura real, ni de un control de acceso ejecutado en Supabase. Faltan las pruebas nativas Node, navegador y matriz E2E. **Ninguna operación C09 está disponible para usuarios reales.**

Siguiente punto del bloque: **C10 — Equivalencia de APR/OTROS, controles de separación de datos y revisión integral**. El enlace de revisión web se preparará después de C10, si se dispone de un despliegue seguro que no afecte producción.
