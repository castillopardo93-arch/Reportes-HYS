# C09 — Reglas obligatorias de auditoría, desvinculación, reasignación y cierre

Fecha: 2026-11-05. Rama: `desarrollo/v243`. Documento de requisitos **aprobados** para C09; NO equivale a implementación ni a auditoría del servidor.

## Roles y límites
- **Supervisor:** recibe alertas de acciones sin responsable disponible, puede solicitar reasignación y verificar correcciones dentro de sus áreas/proyectos y módulo autorizados.
- **Administrador de área:** puede gestionar reasignación, revisión y cierre en su ámbito, conforme a facultades.
- **Administrador global:** intervención excepcional y trazable en ámbitos a los que tiene acceso administrativo.
- **Usuario común:** ejecuta sus propias tareas, sin reasignar obligaciones ajenas ni aprobar su propio cierre.
- Los permisos deben validarse nuevamente en el backend para cada operación, evitando confiar en `profile.rol`, `canWrite`, UUID o selector del navegador.

## Flujo seguro de salida o traslado
1. Desactivar la cuenta, conservar el `usuario_id`, nombre y registros históricos. La desactivación debe disparar una búsqueda de obligaciones abiertas y una alerta a los administradores/supervisores competentes.
2. Identificar proyectos, módulos, áreas, hallazgos y acciones con ese `assigneeId`, distinguiendo pendientes, en proceso, devueltas, enviadas y verificadas.
3. **No reasignar automáticamente las acciones verificadas**: se conserva autoría y evidencia original.
4. Si la acción está enviada a verificación, verificar evidencia antes de transferir; el resultado queda auditado.
5. Reasignar pendientes, en proceso o devueltas a un usuario **activo y autorizado del mismo ámbito**, conservando `actionId` y sin cambiar su estado a `verified`.
6. Registrar atómicamente quién autorizó, quién era el responsable anterior, a quién se reasignó, motivo/justificación, hora del servidor, estado anterior/nuevo, revisión y proyecto/área/módulo. Conservar la cadena de reasignaciones en un log inmutable.
7. Recalcular responsables vigentes y acciones obligatorias. Mantener como históricos los responsables desvinculados, pero no exigirles nuevos avances.
8. Permitir cierre solo si todas las acciones obligatorias vigentes están verificadas por quien tenga facultad independiente; no basta un estado `Completado` ni un comentario sin evidencia.
9. Cierre/reapertura produce evento auditable, motivo, quien autorizó, condición/evidencia, fecha/hora de servidor y referencias de acciones. El cierre debe poder reabrirse sin borrar su evento anterior.
10. No transferir automáticamente tareas entre proyectos o áreas, ni resolver con privilegios de administrador universal sin reglas de ámbito.

## Contrato mínimo del backend de ensayos
- Endpoint autenticado para consultar candidatos **filtrados en servidor** (proyecto, módulo, área, estado y facultad). No exponer directorio completo ni datos personales innecesarios.
- Endpoint transaccional de reasignación `reportId`, `findingId`, `actionId`, `oldAssigneeId`, `newAssigneeId`, `reason`, `notes`, `expectedRevision`, `idempotencyKey`.
- En la transacción bloquear el registro; verificar que sigue asignado al anterior, que el reemplazo está activo y tiene permiso, que el solicitante administra el ámbito y que la revisión coincide.
- Insertar evento histórico permanente con valor anterior/nuevo, UID de actor, evidencia/autorización, hora del servidor y revisión. Rechazar duplicados y conflictos.
- Respuesta y relectura de verificación que confirmen el mismo evento y revisión; si falla la relectura, no afirmar éxito ni duplicar operaciones.
- Desactivación de cuentas y traslado requieren alertas, no eliminación de cuentas, permisos ni datos históricos.

## Validación antes de habilitar operaciones
Pruebas en servidor aislado con supervisor/administrador de área/administrador global/usuario común, múltiples proyectos y áreas, cuenta inactiva, ámbitos cruzados, IDs manipulados, doble envío, misma tarea reasignada concurrentemente, evidencias históricas, tareas enviadas y confirmaciones incompletas.

**No desplegar en Supabase de producción, no alterar `main` ni usuarios reales**. La revisión visual web conjunta se hará tras C10, manteniendo los controles remotos deshabilitados hasta disponer del entorno de ensayo.
