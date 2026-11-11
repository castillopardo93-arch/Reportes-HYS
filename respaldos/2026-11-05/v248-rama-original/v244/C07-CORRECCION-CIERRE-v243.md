# Reportes HYS — C07: Corrección y cierre directo por responsables autorizados

Fecha: 2026-11-05. Rama: `desarrollo/v243`. Aprobación: **pendiente**.
Estado: **interfaz y contrato de seguridad preparados; cierre funcional BLOQUEADO hasta servidor aislado**. No es una función de producción.

## Qué se implementó en la copia de desarrollo
- Se crea el campo técnico opcional `record[6].findingId` en cada hallazgo **cuando un usuario con permiso lo guarda desde el formulario**. Es un UUID generado criptográficamente y persistido junto al registro. Los informes antiguos no se alteran en masa; conservarán su contenido hasta que sean editados autorizadamente.
- En Seguimiento (C06) se presenta un formulario para **Registrar corrección** y **Cerrar hallazgo**: descripción obligatoria (15–2000 caracteres) y una o varias fotografías JPG, PNG o WebP; máximo 8 archivos de 8 MB y 24 MB en total.
- Requisitos visibles preliminares: identidad de sesión activa, permiso de edición, asignación por UUID exacto al módulo APR/OTROS, hallazgo e informe con identificadores persistentes, estado no cerrado y al menos una foto de evidencia.
- Cierre directo preliminar solo si existe **un responsable asignado** y no figuran acciones obligatorias pendientes. En hallazgos con varios responsables, C08 definirá y verificará acciones individuales antes de permitir cierre global.
- El navegador **no decide permisos, no marca estados como cerrados, no genera auditoría y no guarda acciones como completadas**. El backend deberá comprobar todo nuevamente y entregar un recibo verificable de la acción, seguido de una lectura del estado actualizado.
- El formulario está expresamente deshabilitado mientras no estén configurados y auditados `HYS243_ACTIONS_ENABLED`, `HYS243_ACTIONS_ISOLATED`, y un proveedor con `submit` + `reload`. **Ninguna de estas opciones está habilitada en v243.**
- Los datos de C01–C06 se conservan: campos principales [0..4], fotos [5], riesgos, responsables, fecha compromiso y metadatos [6]; el PDF existente no cambia.

## Contrato de servidor obligatorio para habilitar en una copia aislada
1. Usuario autenticado en Auth, perfil activo y permiso de edición actual **del mismo módulo, área y proyecto**; nunca confiar en un UUID de actor remitido por el cliente.
2. Hallazgo identificado mediante `reportId` y `findingId` persistentes, con revisión optimista `expectedRevision` y bloqueo de concurrencia para evitar cierres por registros desactualizados.
3. Releer la asignación vigente del actor **por UUID**, nunca por nombre, y verificar que pueda corregir/cerrar la acción solicitada.
4. Validar y almacenar las evidencias en un repositorio autorizado, verificando tipo, tamaño y propiedad; no aceptar nombres o referencias sin contenido real.
5. En caso de varias acciones/responsables, rechazar cierre global mientras cualquier acción obligatoria permanezca incompleta o sin la verificación acordada (C08).
6. Registrar de forma atómica actor, hallazgo, acción, estado previo/nuevo, fecha de servidor, comentario, IDs de evidencias, revisión y motivo. El historial de eventos y reapertura se ampliará en C09.
7. Aplicar idempotencia por `idempotencyKey`; la reintento de una solicitud con resultado incierto **no debe duplicar cierres ni notificaciones**.
8. Responder solo después del COMMIT verificado, incluyendo UUID de evento y revisión nueva. La relectura autorizada debe confirmar el mismo informe, hallazgo, evento, acción y revisión antes de mostrar éxito; el cliente no modifica el registro a partir de un mensaje no corroborado.
9. Limitar cambios a bases/funciones de ensayo independientes. Antes de tocar Supabase productivo: respaldo verificable, migración, pruebas de roles, auditoría, aprobación expresa.
10. La interfaz no debe exponer credenciales de servicio ni conceder privilegios por coincidencia de nombre o por controles del navegador.

## Estado real de C07
La interfaz, validaciones y contrato pueden revisarse desde el código de desarrollo. **No es posible efectuar un cierre real** todavía: v243 no dispone de un backend aislado configurado ni de una fuente C04 real de responsables. La configuración central v242 sigue deshabilitada. Las pruebas de esta etapa comprueban lógica y regresiones, **no** autorizaciones reales de Supabase ni evidencia almacenada.

Para aprobar el cierre funcional de C07 será necesario el backend de pruebas aislado, la auditoría, E2E con responsables válidos/ajenos, usuarios inactivos, acciones incompletas y simultaneidad, más conformidad del usuario. El enlace de revisión se entregará tras C10, como está acordado, y solo si la revisión puede hacerse en un ambiente seguro; las operaciones de cierre deberán seguir bloqueadas hasta que exista backend autorizado.

## Archivos de esta etapa
- `v243/corrections-v243.js` — elegibilidad preliminar, formularios y proveedor seguro por defecto; sin acceso remoto.
- `v243/corrections-v243.css` — diseño adaptable del formulario.
- `v243/index.html` — persistencia del ID en metadatos, registro del contexto de pantalla y referencias de recursos.
- `v243/finding-detail-v243.js` — muestra el formulario únicamente en la pestaña Seguimiento.
- `v243/test-c07-v243.cjs` — 20 pruebas de contrato con identidades y evidencias sintéticas.

**Siguiente punto:** C08, acciones individuales por responsable; sin cierres globales hasta cumplir todas las acciones obligatorias.


### Endurecimiento obligatorio de C09
La ruta de cierre directo de C07 **no se habilita** por tener un único responsable o estado «Completado»: además debe estar activo el servicio aislado de auditoría C09 y existir acción obligatoria verificada con evidencia por una persona distinta de quien la ejecutó. El backend revalida permisos, evidencia y revisión. Los formularios de corrección siguen separados de los de cierre. No se autoriza cerrar sin esta condición.
