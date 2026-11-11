# Conexión Supabase de v239

El usuario autorizó conectar Supabase para realizar pruebas generales. Se aplicó la migración v239_almacenamiento_aislado_para_pruebas al proyecto existente, creando exclusivamente objetos nuevos v239.

## Activación

- config-v239.js: HYS239_ENABLE_CENTRAL=true.
- Se crearon areas_trabajo_v239, listas_v239, informes_v239, auditoria_areas_v239, apariencia_v239 e historial_apariencia_v239, todas con RLS.
- Áreas, opciones y apariencia se copiaron leyendo v238: 22 áreas, 64 opciones, configuración inicial compartida. Las copias se administran de forma independiente desde v239.
- Se conserva Auth, perfiles, permisos_usuario y areas originales exclusivamente para autenticar y validar permisos. No se modificaron usuarios, contraseñas ni permisos.
- No se copiaron ni se eliminaron los informes de v238. Informes v239 quedó vacío después de las pruebas.
- La auditoría comienza con 22 registros de inicialización de sistema. Las pruebas de cambios de áreas se revirtieron y no dejaron auditorías ficticias.

## Verificación real

Se probaron en Supabase, dentro de una transacción con ROLLBACK, Global en APR/OTROS y Administrador de Área en APR: creación, consulta, finalización, revisión, idempotencia, conflictos y auditoría de cuatro acciones de áreas. Los usuarios de consulta probaron el rechazo de escritura. Un perfil inexistente no pudo leer informes.

No existe Supervisor real y no se creó una cuenta para probarlo; el rol ya pasó las pruebas locales de PostgreSQL. Tampoco se amplió a OTROS el acceso del Administrador de Área existente.

La API HTTPS real respondió correctamente a cinco pruebas anónimas: los cuatro recursos consultados y la RPC rechazaron el acceso con 401/42501, sin exponer datos. La RPC solo tiene EXECUTE para authenticated y valida perfil/ámbito dentro del servidor.

Las huellas completas de perfiles, permisos, areas, informes v238, catálogos v238 y apariencia v238 fueron idénticas antes y después. El respaldo de estructura y huellas permanece fuera del repositorio público.

## Estado de entrega

La copia conectada se prepara y guarda sin desplegar. No equivale a aprobar ni publicar v239. Para pruebas generales desde el enlace HTTPS debe autorizarse la publicación del entorno de revisión independiente; la aplicación oficial permanecerá intacta.

RESULTADO-SUPABASE-v239.json y RESULTADO-API-v239.json registran los resultados sin identificadores personales ni credenciales.
