# Reportes HYS · v279 — Ficha laboral y datos de contacto
Fecha: 2026-11-08
Rama: `desarrollo/v279-ficha-laboral-contacto`
Base aislada: `desarrollo/v278-control-accesos`
Estado: prepublicación de desarrollo, sin publicar ni alterar producción.

## 1. Modificaciones implementadas en la aplicación real
- Se añadió país y tipo de documento al formulario laboral. RUT chileno conserva validación de DV; cédulas, DNI, pasaportes y otros documentos extranjeros admiten números, letras, signos básicos y ceros iniciales sin aplicar incorrectamente la validación chilena.
- El antiguo dato `rut` continúa como número de documento para compatibilidad con los datos anteriores. Campos nuevos: `pais_documento`, `tipo_documento`; sin eliminación de registros.
- Código interno inicialmente igual al documento, pero editable por separado. Cambiar el documento actualiza el código solo mientras no haya sido personalizado.
- Se retiró «Unidad organizacional» de la captura y del modelo de ficha.
- Correo corporativo y personal siguen siendo campos independientes; la validación exige al menos uno de los dos y comprueba formato.
- Preferencias: corporativo, personal, celular, y «Todas las vías de contacto registradas». Esta preferencia **no implica** que el envío de notificaciones de todos los canales esté ya desplegado.
- El «Turno habitual» consulta valores activos del campo `shift` en el catálogo real de `listas_v242`. No se inventa una segunda lista. Los turnos antiguos se muestran sin borrar el valor previamente registrado.
- **Administrador general → Gestión de usuarios → Mis datos laborales**: ruta de edición de su ficha propia, sin modificar rol ni permisos. El supervisor responsable es opcional solo para esta ficha de Administrador general.
- **Usuarios registrados → Ficha laboral**: ruta de edición de los datos laborales de usuarios existentes, separada de «Estado de acceso» y del asistente de roles.
- **Áreas y opciones → Opciones de formularios → Turno**: consulta del catálogo real y soporte preparado para agregar, editar, desactivar y reactivar mediante RPC auditada. Los demás campos admitidos por el catálogo comparten el mismo servicio.

## 2. Integración de servidor: preparada, NO instalada
Se preparó `propuestas-backend-v279/FICHA-LABORAL-Y-OPCIONES-v279.sql`. Contiene:
- Tabla `fichas_laborales_v279` con RLS y restricciones de acceso; no se modifican tablas de roles ni de permisos.
- RPC `hys279_capacidades` para detectar inequívocamente si el guardado auténtico está instalado.
- RPC `hys279_obtener_ficha`, `hys279_guardar_ficha` y `hys279_guardar_opcion`, con autorización solo a Administrador general activo, control de revisión, validación del documento, correos y áreas, auditoría de cambios y protección de la cuenta oficial.
- El cambio de nombre propio del Administrador general se sincronizaría a `perfiles.nombre` solo al guardar explícitamente su propia ficha; sus roles y permisos permanecen protegidos.
- La auditoría de ficha registra identificadores y metadatos de modificaciones, pero no persiste números de documento, celulares ni correos completos en el historial.
- Sin eliminación automática de otras cuentas, sin alteraciones del directorio de Auth, sin despliegue de servicios en producción.

**Advertencia esencial:** hoy el backend v279 no está instalado en Supabase. El front-end carga la presentación real, consulta lo que ya existe y **bloquea cualquier nuevo guardado cuando falta el procedimiento de servidor**; no se promete persistencia ficticia. Para activar esa funcionalidad será necesario aprobar e instalar el SQL tras revisión de seguridad y respaldo y realizar pruebas con cuentas autorizadas. No se instalará por defecto.

## 3. Pruebas efectuadas
- **19/19** pruebas unitarias del modelo: documento extranjero alfanumérico, ceros iniciales, RUT chileno válido e inválido, código interno, correos alternativos, preferencia Todas, ausencia de Unidad, supervisor opcional solo para Administrador general, validación de turnos y correos para cuenta.
- **7/7** pruebas unitarias del adaptador: rechazo seguro sin backend, lectura de ficha, guardado mediante respuesta verificada, consulta sin duplicar turnos, llamada de cambio a RPC preparada.
- Sintaxis de los archivos JavaScript modificados y de los bloques embebidos comprobada.
- Se consultó el esquema y las políticas existentes en Supabase **solo lectura** para revisar compatibilidad de `perfiles`, `listas_v242` y `eventos_v242`.
- No se comprobó todavía la ejecución del SQL en una base de desarrollo ni el flujo E2E en navegador real. Por tanto, no se puede afirmar que la persistencia de fichas y las ediciones de turnos estén funcionando en producción.

## 4. Condiciones preservadas
- Sin laboratorios ni usuarios ficticios en la pantalla principal.
- v278, respaldos protegidos, main y aplicación oficial sin modificar.
- Supabase de producción sin cambios de esquema, RPC o datos.
- Modo offline/PWA fuera de alcance.
- Gestión de roles y facultades sin alteraciones.

## 5. Validación pendiente antes de publicar
- Autorizar un entorno Supabase de desarrollo o, mediante aprobación expresa y respaldo, la instalación de la propuesta en un sistema real.
- Verificar RLS, validación de RUT y documento extranjero, códigos, concurrencia de revisiones, turnos, trazabilidad, edición propia del Administrador general y conservación de la cuenta oficial.
- Verificar visualmente escritorio/móvil y accesibilidad del formulario. 
