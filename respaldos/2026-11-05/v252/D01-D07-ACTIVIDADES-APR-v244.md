# Reportes HYS v244 — Bloque D01–D07: actividades APR

**Fecha:** 2026-11-05 | **Rama:** `desarrollo/v244` | **Base:** v243 visualmente aprobada, preservada en `desarrollo/v243`.

## Objetivo y alcance
Completar antes de las conexiones los formularios de **Actividades HYS** y **Actividades por área**, con contratos estables y reversibles; mantener la tabla y las fotografías ya existentes. OTROS conserva únicamente Hallazgos y no se incluye en el bloque D.

## Contrato de datos, sin migraciones todavía
- Ambos registros APR mantienen sus valores históricos **[0..3]**, evidencias/adjuntos en **[4]**.
- Los nuevos metadatos se guardan en **[5]** como objeto: `activityId` (UUID), `activityType` (`informative`/`assigned`), `identity` (usuario APR vinculado con UUID/nombre/módulo o `null`), `linkedFindingId` (UUID existente del Hallazgo o `null`) y `dueDate` (AAAA-MM-DD o cadena vacía).
- No se cambia el índice de fotografías, la estructura de Hallazgos ni la forma del paquete `pack()`. El guardado de datos existentes sigue preservando la información adicional.
- Un Hallazgo puede estar vinculado solo si tiene `findingId` estable; no se persisten índices de filas como claves. Si se elimina o no existe, el usuario debe corregir el vínculo antes de editar/guardar.
- `activityId` es estable durante la edición; los registros antiguos lo reciben al guardarse nuevamente. **No es una clave autorizada por servidor**.
- El campo original en texto no se sustituye silenciosamente por el usuario vinculado. La vinculación estructurada se guarda aparte, sin perder las viñetas ni detalles históricos.

## D01–D07
| Punto | Resultado de desarrollo |
|---|---|
| D01 | Campos y resultados de Actividades HYS conservados; se corrigió primera línea de viñetas sin punto inicial. |
| D02 | Selector opcional de ejecutor registrado APR mediante proveedor de directorio autorizado; en demostración usa personas ficticias, sin conexión real. |
| D03 | Selector opcional de Hallazgo vinculado, identificado por UUID estable; referencias faltantes se muestran para revisión. |
| D04 | Actividades por área conservan su tabla, estado, responsable multilinea y fotografías; comparten el editor complementario. |
| D05 | Clasificación explícita: informativa o tarea asignada de planificación; no equivale a una acción C08 verificada. |
| D06 | Fecha compromiso obligatoria para tareas; resumen local en tabla y PDF. Envío de notificaciones, ejecución/verificación y reasignación permanecen bloqueados. |
| D07 | Estilo adaptable, integración en PDF de APR y pruebas estáticas/de lógica para resguardar APR/OTROS, encabezados, fotos y viñetas. |

## Preparación de conexiones futuras
- `Hys244Activity.setDirectoryProvider(fn)` está deshabilitado salvo que un entorno aislado configure **ambos** indicadores `HYS244_APR_DIRECTORY_ENABLED` y `HYS244_APR_DIRECTORY_ISOLATED` más un proveedor explícito.
- El directorio aislado debe devolver solo usuarios APR activos y autorizados con `user_id`, `nombre`, `modulo`, `activo` y `puede_ver`; la interfaz hereda `Hys243Assignees.normalizedDirectory`.
- La autorización y filtrado real **no pueden depender del navegador**. Enlace de identidad, visibilidad por empresa/proyecto/área, asignación formal, notificaciones, cumplimiento y auditoría deben validarse en el servidor independiente.
- `activityType:'assigned'` es **una intención de planificación**, sin evento de asignación, confirmación o ejecución. La UI debe mostrarlo explícitamente.

## Controles de seguridad y compatibilidad
- No tocar producción, `main`, `desarrollo/v243`, Supabase real ni credenciales.
- `v244-review` solo usa personal y hallazgos ficticios. `v244-review/build-preview.sh` copia recursos de una lista blanca desde `v244/` al sitio aislado. No incluye clientes de Supabase.
- Aún faltan pruebas E2E reales de navegador, impresión/PDF por dispositivos y regresión completa nativa con Node. La aprobación previa v243 **no implica** aprobación visual v244.
- La agenda de la **letra E** queda después: perfiles/cargos/contacto (E02), facultades reales (E01/E03), áreas (E04), auditoría (E05) y sus pantallas/proveedores desactivados. Conectar o migrar requiere autorización separada.
