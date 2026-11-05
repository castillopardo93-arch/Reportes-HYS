# Reportes HYS — Etapa F de la Lista Maestra (F01–F07)

**Fecha:** 2026-11-05  
**Versión:** v251 de desarrollo, basada en v250.  
**Estado:** implementación y pruebas **locales** realizadas; conexión y aprobación operativa **pendientes**.  
**Rama:** `desarrollo/v251`; **ruta:** `v251/`.

## Alcance verificado según la Lista Maestra

| Punto | Alcance | Estado de desarrollo | Pendiente para producción |
|---|---|---|---|
| F01 | Campana y bandeja Pendientes en APR y OTROS | Integrada desde v245–v250; consulta por módulo/usuario | Validación navegador con cuentas y permisos reales |
| F02 | Aviso individual al guardar/asignar una tarea | Detección por UUID, propuesta local por responsable, sin envío | Conectar transacción confirmada de `hys242_guardar_con_motivo` con cola real |
| F03 | Correo transaccional | Plantilla, worker Resend y preferencias diseñados en fuente | Confirmar proveedor, remitente/dominio, consentimiento y secretos; desplegar servicio |
| F04 | Pendiente/enviado/fallido/visto/confirmado | Contrato de estados, RPC de lectura y acuse, auditoría SQL preparada | Migrar servidor y pruebas de confirmación real |
| F05 | Notificar asignación, reasignación, cierre, reapertura | Motor de diferencias por UUID, cierre únicamente con verificación/evidencia | Activar eventos solo tras confirmación central; distribuir a antiguos/nuevos responsables |
| F06 | Canales, fechas, resultados y exportación a seguimiento/PDF | Historial local de propuestas + anexo PDF separado rotulado **sin envío** | Historial central, incorporación al PDF de seguimiento autorizado sin alterar PDF original |
| F07 | Reintentos sin duplicación y errores | Clave determinista, fusión idempotente, política de backoff y reserva SQL | Configurar scheduler, proveedor, webhooks de entrega y pruebas E2E |

## Implementación en v251

- `notifications-f251.js`: planificador local F02–F07, sin correos ni mutaciones de Supabase.
- `notifications-f251.css`: historial visual en ficha Notificaciones y botón de anexo PDF local.
- `index.html`: montaje por sesión autenticada y módulo; APR y OTROS comparten implementación.
- `pending-dashboard-v250.js`: la pestaña Notificaciones muestra propuestas reales de la sesión local, nunca estados ficticios.
- `storage-v242.js`: almacenamiento aislado con prefijo `hys-v251::`.
- `supabase/etapa-f251-sin-desplegar.sql`: propuesta de colas, estados, RLS, auditoría, acuse y reserva de correos. **NO desplegada.**
- `supabase/functions/hys251-email-dispatch/index.ts`: propuesta de worker de correo con secreto, consentimiento e idempotencia de proveedor. **NO desplegada.**
- `test-f251.cjs`: 14 pruebas de lógica F02–F07.

## Seguridad y límites que NO se levantan

1. Sin credenciales `service_role` expuestas en web.
2. Sin modificación de usuarios, contraseñas, áreas, permisos, RLS o datos reales.
3. Sin publicación ni modificaciones en `main`, v246, v249 o v250.
4. Sin aviso marcado enviado, fallido, visto o confirmado si no hay evento confirmado por el servidor.
5. Un rol supervisor solo puede revisar personal directamente a cargo y área autorizada, sujeto a integración del organigrama `v250`.
6. Los archivos e historial de notificaciones preparados son **locales de prueba**, no evidencias de entrega.
7. Los correos, el servicio de ejecución, la programación de recordatorios y la actualización de PDF con historial verificado exigen una fase posterior de integración con autorización expresa.

## Pruebas ya realizadas

- 14/14 pruebas unitarias F02–F07 satisfactorias (generación, deduplicación, asignación, reasignación, cierre con evidencia, reapertura, vencimientos, backoff, segregación de módulos y anexo).
- Sintaxis JS válida en motor F y scripts principales.
- Sin alteración de las banderas centrales `HYS242_ENABLE_CENTRAL=false` y `HYS242_DEPLOYMENT_READY=false`.

## Pruebas que faltan para aprobar F operativamente

- Acceso y funcionamiento visual en navegador con cada rol/módulo; pruebas de formularios y guardado local en v251.
- Prueba SQL en entorno aislado de migración RLS y doble confirmación, no en el proyecto oficial.
- Prueba de proveedor real de correo: envío, error, rechazo, desuscripción, duplicados, ventana de idempotencia y entrega.
- Verificar anexo PDF con datos reales autorizados y preservación de PDF original.
- Pruebas de cola y auditoría en backend aislado, con permisos por organización, área y personal a cargo.

**Decisión:** F01–F07 terminados como código y pruebas unitarias de desarrollo; **no marcar F como aprobada o operativa** hasta las pruebas anteriores. Revisión visual por el usuario y activación central son pasos separados.
