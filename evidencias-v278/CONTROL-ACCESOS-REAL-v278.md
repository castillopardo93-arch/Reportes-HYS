# Reportes HYS — v278: Control funcional de accesos de usuarios
Fecha: 2026-11-08
Rama aislada: `desarrollo/v278-control-accesos`
Base: `desarrollo/v277-prepublicacion-real`

## Solicitud
Incorporar en la aplicación real (sin laboratorios visibles) las operaciones administrativas de suspensión, reactivación y desvinculación de usuarios registrados, con conservación del historial, protección de facultades y trazabilidad.

## Cambios aplicados

1. Dentro de **Administrador general → Usuarios registrados**, cada cuenta administrable dispone de **Estado de acceso**, sin crear una administración paralela.
2. Nueva pantalla con datos de usuario, estado actual, acciones disponibles, motivo obligatorio, confirmación escribiendo el nombre y segunda aceptación.
3. **Suspender acceso:** envía `p_datos.activo=false` a `hys242_guardar_usuario`, con motivo `SUSPENSION_ACCESO | ...`. Este procedimiento deja registro de autor, motivo y datos anteriores/nuevos en `eventos_v242`.
4. **Desvincular y dar de baja:** también desactiva el ingreso, registrando `DESVINCULACION_BAJA | ...`. Se conservan informes, compromisos y auditoría. La clasificación se obtiene del historial de eventos, no de una columna inexistente en producción.
5. **Reactivar acceso:** `p_datos.activo=true`, con motivo `REACTIVACION_ACCESO | ...`. Puede fallar si `perfiles.activo=false`, porque la validación del servidor exige revisión adicional y la interfaz no ignora dicha restricción.
6. El sistema consulta `hys242_listar_usuarios` inmediatamente antes y después del cambio; contrasta revisión, activo, rol y ámbitos para detectar modificaciones concurrentes.
7. Restricciones: solo administrador general activo; ni su propia cuenta ni administrador general protegido; la RPC vuelve a validar permisos. No se usa `service_role` en el navegador.
8. Seguimiento de sesiones abiertas: cuando una sesión de la aplicación está activa, se ejecuta `hys242_contexto` cada 45 segundos y al volver a la pestaña (con limitación de frecuencia); si Supabase confirma denegación, la aplicación intenta cerrar la sesión local y vuelve al ingreso. No se fuerza cierre ante fallas transitorias de red.
9. No hay servidores, simuladores ni usuarios ficticios cargados en el `index.html` de prepublicación real.

## Conexión real existente: inspección sin escrituras

Se inspeccionó Supabase en modo **solo lectura** y se confirmó:

- `hys242_guardar_usuario`: RPC que registra el motivo en `eventos_v242`, actualiza `cuentas_v242` y comprueba `hys242_private.validar_cuenta`; acceso `authenticated`, no `anon`.
- `hys242_listar_usuarios`: devuelve `usuario_id`, `nombre`, `rol`, `activo`, `revision` y `ambitos`; acceso `authenticated`, no `anon`.
- `hys242_contexto`: rechaza perfiles no autorizados y el validador `hys242_private.activo()` comprueba `perfiles.activo AND coalesce(cuentas_v242.activo, true)`.
- `eventos_v242`: audita cambios y conserva motivo, autor y antes/después. El Administrador general tiene lectura de auditoría.
- Todas estas funciones ya existen; **no se publicaron nuevas funciones ni se modificó Supabase**.
- La política protege expresamente cuentas de Administrador general y cambios sobre la propia cuenta.

## Verificación realizada

- Los archivos JavaScript `control-accesos-v278.js` y `gestion-usuarios-v265.js`, más los bloques embebidos en `index.html`, superan validación de sintaxis.
- 12 pruebas de lógica con un cliente que simula respuestas del RPC: protección de rol y cuenta propia, validaciones, suspensión, preservación de ámbitos, clasificación, baja, reactivación, concurrencia, denegación por backend, bloqueo del laboratorio.
- **Las pruebas no reemplazan una operación real autenticada.** La lectura de Supabase es real pero no se escribieron datos ni se verificó el botón con un usuario real.
- CSS incorporado para escritorio y móvil, sin prueba visual manual.

## Limitaciones que NO deben ocultarse

- **No se borra físicamente la cuenta ni la identidad de Auth.** Se realiza una baja lógica: `activo=false`, con auditabilidad y conservación de documentos.
- **No existe revocación inmediata de todos los tokens JWT y dispositivos.** La sesión de la aplicación se revalida como máximo cada ~45 s mientras el navegador está visible, pero esto no equivale a invalidar universalmente un JWT. Para revocación reforzada hace falta un servicio administrativo de servidor autorizado y controlar el resto de políticas de acceso.
- **La reasignación de obligaciones pendientes no es automática.** Antes de finalizar una desvinculación, debe revisarse quién asume compromisos y pendientes.
- **No se habilitó el guardado central de informes ni el alta real de trabajadores en el asistente de cinco pasos.** Esos módulos siguen pendientes de integración completa. Esta mejora se centra únicamente en gestión de estado de **cuentas ya existentes**.
- Cualquier acción de suspensión/reactivación ejecutada con una cuenta administradora desde el desarrollo **modifica el estado real de esa cuenta en el Supabase conectado**. Confirmarlo solo para usuarios autorizados.
- El modo offline/PWA sigue excluido.

## Regla de versiones
Sin alterar `main`, respaldos protegidos, v277 ni la aplicación oficial. No se despliega Supabase. Las próximas revisiones deben crear v279 o correlativa una vez comprobado el último número.
