# v241 — Copia real independiente: preparación de integración

> Actualización 5 de noviembre de 2026: respaldo aplicación/Auth restaurado localmente y base SQL v241 instalada. Web desactivada; endpoint pendiente por rechazo de revisión automática. Estado vigente: [INSTALACION-BASE-20261105.md](INSTALACION-BASE-20261105.md). El texto inferior es histórico.

> Estado anterior conservado como registro. La etapa de integración ya está completada en código y pruebas locales: consultar [INTEGRACION-SEGURIDAD-v241.md](INTEGRACION-SEGURIDAD-v241.md). Continúa sin instalación ni publicación remota. Las limitaciones de integración indicadas abajo corresponden a la etapa anterior.

Fecha: 4 de noviembre de 2026. Base: desarrollo/v239. Nueva rama: desarrollo/v241; nueva carpeta v241/. Numeración consultada antes de crear: no había rama ni carpeta v241.

## Protección
v239 no se sobrescribe. BASE-PROTEGIDA.json registra las huellas SHA256 de sus diez recursos. El respaldo externo Reportes-HYS-v239-protegida-antes-v241.zip conserva esos recursos de código; no contiene informes ni sustituye un respaldo de datos de Supabase. Las versiones v232, v234, v235, v237, v238, main y la aplicación publicada no se modifican. No se reutiliza el identificador de alojamiento v239.

## Real, sin simuladores
Esta copia conserva el cliente Supabase y el inicio de sesión real de la base. No tiene demo-client, mock-supabase, personas ficticias ni selector para suplantar roles. Cada versión usa sus propias claves de almacenamiento y referencias de tablas/RPC v241; no modifica informes ni preferencias v239. Los nombres visibles son Administrador general, Administrador, Supervisor y Usuario, sin cambiar las claves de rol en los perfiles existentes.

El motor PDF se conserva exactamente desde v239, incluida su implementación completa; no se cambió su formato. El resto de recursos se adapta a un espacio de nombres v241 para evitar mezclar borradores y colas.

## Lo preparado
- Pantalla real Facultades, dentro de la cinta principal, exclusiva del Administrador general autenticado. Consulta administradores y áreas desde servidor; muestra errores reales, no inventa resultados.
- Propuesta de tabla facultades_v241 por administrador/módulo, con UUID de áreas, acciones, revisión y actor. Cada administrador puede tener asignaciones distintas.
- Propuesta de auditoria_facultades_v241 inmutable para clientes. Motivo obligatorio; inserción de asignación y auditoría en una única transacción.
- RPC hys241_listar_administradores e hys241_asignar_facultades con identidad tomada de auth.uid(), comprobación de único general, destino administrador, protección propia/general, ámbitos válidos y control optimista de revisión.
- Funciones de autorización propuestas en esquema privado con search_path fijo y EXECUTE retirado de anon/PUBLIC. RLS y SELECT mínimos para las dos tablas nuevas; no se concede escritura directa.
- Propuestas de base central y apariencia v241, separadas de las versiones protegidas. No se copian informes reales.

## Estado exacto: NO activada y NO lista para uso operativo
No se aplicó ningún SQL al servidor remoto ni se publicaron Edge Functions o una web v241. HYS241_DEPLOYMENT_READY=false bloquea el guardado del panel y la edición de informes. Este indicador es una puerta de despliegue, no un sustituto de RLS.

Las propuestas todavía NO conectan todas las casillas delegadas con cada operación de informes, PDF, revisión, áreas y gestión de usuarios. Tampoco sustituyen el endpoint heredado admin-users-v235, cuyo bloqueo fue identificado en el diagnóstico. Por tanto, guardar una asignación no puede presentarse como habilitación efectiva de esas acciones. No instalar ni activar estas propuestas por separado sin terminar esa integración y sus pruebas de servidor.

No se ha migrado ningún usuario, informe, evidencia ni estado de revisión. El flujo formal continúa pendiente de integración aprobada; no se cambian estados históricos.

## Inventario remoto revisado en lectura
Se confirmó nuevamente el proyecto existente: 15 tablas públicas con RLS, funciones y ACL, políticas, triggers propios, cero buckets y un único perfil administrador_global. El diagnóstico anterior incluye dependencias, funciones administrativas y respaldo de metadatos. No se descargaron informes ni contraseñas. El estado de un respaldo completo restaurable de datos/Auth/evidencias sigue sin verificar; debe acreditarse antes de instalar seguridad o migraciones.

## Pruebas ejecutadas
verificar-v241.cjs: las diez huellas de la base protegida no cambian; sintaxis de scripts válida; motor PDF idéntico; ausencia de simuladores; bloqueo de activación y ausencia de identidad de alojamiento heredada.

test-servidor-v241.cjs: 11 grupos SQL en PostgreSQL WASM local con identidades ficticias de prueba, nunca cuentas reales: listado exclusivo del general; asignaciones independientes/auditoría; destinos protegidos; áreas/facultades/motivo; conflictos; lectura propia; rechazo de escrituras directas y borrado de auditoría; usuario sin acceso; anónimo rechazado; revocación independiente; general inactivo rechazado. Estas pruebas ejecutan las funciones SQL preparadas, no una imitación JavaScript del servidor.

No se declara aprobada una integración completa, autenticación visual real, ejecución en Supabase remoto ni funcionamiento de facultades delegadas en formularios. Pendiente también regresión completa de Inicio, fotos/PDF, desconexión, cambios de sesión y navegación web/móvil sobre la integración terminada.

## Siguiente etapa y aceptación
Completar la aplicación efectiva de cada facultad en RPC, políticas y endpoint independiente; mantener protección del único general y ámbitos de cada administrador; probar todas las operaciones por rol y manipulación directa de API; verificar respaldo restaurable; presentar un paquete SQL/Edge definitivo con alcance y reversión. Solo tras la autorización de esa etapa se instalaría el servidor independiente v241 y, con pruebas remotas aprobadas, se habilitaría la nueva copia para revisión real.

## Reversión
Esta etapa solo agrega código y documentación. No requiere rollback de Supabase. Conservar la rama/carpeta y el ZIP; no borrar tablas ni restaurar datos de producción. Una futura instalación debe ser aditiva, mantener el sitio v239 accesible y desactivar v241 antes de cualquier reversión. No ejecutar DROP, DELETE ni cambios de usuarios como reversión automática.

## Referencias revisadas
https://supabase.com/docs/guides/database/postgres/row-level-security
https://supabase.com/changelog
