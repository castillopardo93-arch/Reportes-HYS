# v242 — Correcciones de la auditoría

5 de noviembre de 2026. Base conservada: v241. Esta etapa modifica únicamente la nueva copia y pruebas/documentación. No se aplica SQL remoto ni se despliegan funciones o sitios.

## Correcciones y criterios de aceptación

| Hallazgo | Corrección | Archivos y comprobaciones |
|---|---|---|
| A1: solo lectura podía enviar/corregir | Validación actual de escritura y ámbito en servidor para enviar/corregir; controles propios ocultos cuando falta escritura. Facultades de aprobación siguen independientes y sin autoaprobación. | seguridad-operativa-v242.sql; operaciones-v242.js. Rechazo de enviar y corregir en APR/OTROS después de revocar escritura; se conserva aprobación delegada explícita. |
| A2: caché cruzaba usuarios | Contexto inmutable de base nativa y generación de sesión; validaciones tras lecturas/aperturas y al confirmar; PDF y listados usan contexto capturado. | storage-v242.js; index.html. Cambio de usuario/módulo/cierre durante lectura o apertura no escribe otro ámbito; un resultado antiguo no se entrega a una sesión nueva. |
| A3: responsable/PDF con nombre anterior | Nombre efectivo tomado de cuentas_v242 o perfiles al iniciar informe; creador/último actor mantienen UUID reales. Un informe existente conserva su responsable histórico para no General. | base-central-v242.sql. Primer guardado con nombre efectivo y PDF aceptado; cambio posterior de perfil conserva nombre histórico y registra nuevo nombre del actor. |
| A4: invitación no abría contraseña | Retorno autorizado incorpora recuperar=1 y activar=1; pantalla acepta sesión de enlace tipo invite en SIGNED_IN o INITIAL_SESSION; sesión de recuperación/activación no persiste como ingreso normal. Sin configuración de retorno no se prepara ninguna solicitud. | endpoint admin-users-v242; index.html. Enlace correcto, tipo inesperado, falta de sesión y retorno ajeno cubiertos; correos reales pendientes. |
| A5: solicitud pendiente no se podía corregir | Gestión autorizada con revisión, motivo, corrección/cancelación y auditoría; reserva de envío exclusiva, resultados explícitos y reintentos sin duplicar cuentas. | usuarios-operativos-v242.sql; gestion-invitaciones-v242.sql; endpoint; operaciones-v242.js. Corrección/cancelación conservan filas; revisión antigua/nula, cuentas ajenas, reserva concurrente y envío incierto rechazados. |

Se ajustaron rótulos visibles heredados a Administrador general sin cambiar las claves internas de roles.

## Invitaciones y seguridad

Estados: preparada → en_envio → auth_creada → completa. Antes del envío, un rechazo confirmado puede quedar fallida y permitir corrección/reintento. Una solicitud no ejecutada puede cancelarse sin borrarla. Un resultado desconocido queda incierta y no permite reenviar automáticamente.

Solo el servidor puede reservar envío o registrar identidad/resultados: EXECUTE de esas RPC exclusivo de service_role; clientes sin UPDATE directo a invitaciones. El General o el creador con facultad vigente pueden consultar/revisar sus solicitudes autorizadas; correcciones revalidan los ámbitos anteriores y nuevos. La auditoría identifica a quien corrige, incluso si el General revisa una solicitud creada por un administrador.

El endpoint comprueba usuario autenticado, origen HTTPS exacto y permisos antes de crear nada. La cuenta nueva se vincula desde la respuesta del proveedor antes de habilitar acceso; no se modifica una cuenta existente ajena, no se borran cuentas como compensación ni se usan metadatos editables del usuario para autorizar.

Si el proveedor pudo crear una cuenta pero no se pudo confirmar su identidad en la base, se conserva el estado incierto/en proceso y se requiere conciliación administrativa externa; no se ofrece vinculación manual insegura por coincidencia de correo. Ese bloqueo deliberado evita duplicar o apropiarse de cuentas. No se declaran resueltos automáticamente los fallos de infraestructura del proveedor.

## Pruebas realizadas

**105 grupos aprobados**, con datos sintéticos y fuera de producción. No son 105 pruebas end-to-end en Supabase real.

| Script | Grupos |
|---|---:|
| test-servidor-v242.cjs | 11 |
| test-integracion-v242.cjs | 27 |
| test-runtime-v242.cjs | 23 |
| test-edge-v242.cjs | 13 |
| test-pdf-v242.cjs | 3 |
| test-correcciones-sql-v242.cjs | 12 |
| test-cache-sesion-v242.cjs | 7 |
| test-activacion-controles-v242.cjs | 9 |

La integración de 27 grupos se ejecutó también sobre el paquete SQL atómico generado, sin duplicarla en el total. Los PDF de prueba contienen fotos sintéticas y 10/12/4 páginas. La matriz runtime cubre los cuatro roles en APR y OTROS, solo lectura, desconexión, cuota, finalización, responsable y cambios de sesión. El endpoint usa servicios externos sustituidos solo dentro del test; ninguna cuenta/correo real.

verificar-v242.cjs: doce huellas v241 intactas, scripts válidos, motor PDF idéntico, sin simulador ni identidad de alojamiento heredada, activación bloqueada. build-v242.cjs: doce recursos runtime y manifiesto de distribución, sin SQL ni datos privados.

La consulta final a Supabase confirmó 0 tablas v242, 7 cuentas Auth y un único General. La rama y copia v241 se conservan; no se descargaron ni modificaron informes reales para estas correcciones.

## Entrega y pendientes

- Código y pruebas en rama desarrollo/v242, carpeta v242, repositorio público Reportes-HYS.
- Paquete descargable de código: Reportes-HYS-v242-correcciones.zip. Respaldos reales permanecen fuera de GitHub y del paquete.
- No hay publicación ni enlace HTTPS v242 todavía. El enlace v241 sigue apuntando a v241; no incluye estas correcciones.
- Pendiente: comprobar Deno/proveedor/correo reales y allowlist de retornos; inventario y respaldo vigente antes de instalación; aplicar solo objetos v242 y endpoint nuevo tras autorización de la siguiente etapa; probar con cuentas aisladas autorizadas los cuatro roles, invitación completa, fotos, PDF, cambio de módulo y móvil en navegador.
- Origen de endpoint y retorno deben configurarse explícitamente en HYS242_ALLOWED_ORIGINS y HYS242_INVITE_REDIRECT. Sin configuración, deniega acceso; no se inventa una dirección pública.
- No se migran informes/ajustes de cuentas/facultades entre versiones. El SQL prepara catálogos y apariencia desde v241 cuando existe; sus informes y usuarios existentes quedan en sus versiones. Revisar cualquier necesidad de migración en una etapa aprobada.

Paquete SQL: ocho fuentes exclusivas v242, instalacion-atomica-v242.sql. SHA256: `a76ed0443e95eda8bf4a5c9b2593cb636739df79a04c8059ae6bdf9a0a91d7ad`.

## Reversión

Esta etapa no requiere reversión remota porque no instaló nada. Conservar rama/carpeta/ZIP y doce huellas de base. En futura instalación, volver al runtime anterior y desactivar v242 si fuera necesario, conservando informes, evidencias, auditorías e invitaciones. No ejecutar DROP, borrar usuarios ni limpiar datos como reversión automática. main y aplicación oficial no se publican por esta entrega.
