# Reportes HYS v258 — Gestión de usuarios

Fecha: 6 de noviembre de 2026 (Chile). Base: v257. Copia de desarrollo independiente; no aplicación oficial.

## Interfaz

- Usuarios es la entrada única a la gestión de cuentas. Seguimiento abre informes y no contiene acceso al mismo formulario de usuarios. Se limpia el contenido al cambiar de función.
- Directorio con búsqueda por nombre/rol/tarjeta, filtros de rol y estado y una sola ficha de edición.
- Datos de cuenta, tarjetas/áreas, estado y motivo agrupados; cuenta propia y Administrador general protegidos. Se mantienen permisos y validaciones del servidor.
- Restablecer devuelve el formulario a sus valores iniciales; Cancelar descarta la edición. Se confirma antes de descartar cambios sin guardar.
- Guardar conserva validación de revisión del servidor y registra el cambio. Deshacer permite revertir el último cambio de acceso de esta gestión, del mismo actor y sin cambio de rol, mediante una nueva modificación auditada con motivo. Si otra sesión modificó la cuenta, la reversión se rechaza por revisión. Cerrar gestión o cambiar sesión elimina este deshacer temporal.
- Los cambios de rol requieren edición manual para revertirse y revisión de facultades; no se promete revertir automáticamente facultades retiradas, contraseñas, informes ni actuaciones de terceros.
- Configurar facultades abre la cuenta administrativa seleccionada directamente en el panel específico, exclusivo del Administrador general.

## Actividad registrada

El Administrador general puede consultar por cuenta los últimos 50 eventos combinados de eventos_v242 y auditoria_facultades_v242 (acciones del usuario y cambios sobre esa cuenta). Se muestran actor, fecha, acción, motivo y valores de acceso anteriores/posteriores en lenguaje legible. No se edita ni borra auditoría desde esta interfaz.

No equivale al control integral de toda actividad: los informes que permanecen locales y sin sincronización central no están en este historial. El guardado central de informes, correos/invitaciones y el correlativo PDF siguen desactivados o pendientes. No se amplían las políticas RLS ni se instalan funciones nuevas. Las modificaciones que José confirme en el formulario sí se aplicarán a las cuentas operativas en Supabase.

## Verificación

470 pruebas automatizadas aprobadas, cero fallidas/omitidas. Dos recorridos de navegador, de 1440 y 390 píxeles, con nueve comprobaciones de búsqueda, filtros, edición/reset, guardar/deshacer, actividad, navegación sin formulario duplicado, selección de administrador, revocación y rechazo de reversión concurrente. Autenticación y datos simulados; cero peticiones al backend y cero errores JavaScript en esos recorridos.

Se inspeccionó la interfaz de escritorio/móvil y se corrigió el ancho mínimo heredado de tablas para evitar desbordamiento horizontal. La construcción prepara 44 recursos locales. No se modificaron cuentas, contraseñas, facultades, informes oficiales ni datos remotos durante estas pruebas. Pendiente validación de José con su cuenta real en el nuevo enlace.
