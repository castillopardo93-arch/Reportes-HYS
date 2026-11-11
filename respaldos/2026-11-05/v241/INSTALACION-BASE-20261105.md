# v241 — Respaldo y base instalada

5 de noviembre de 2026, America/Santiago. Este informe sustituye el estado anterior de preparación/no instalación. **Base SQL instalada; web todavía desactivada y sin publicar. Endpoint nuevo NO desplegado.**

## Respaldo privado y restauración

Se comprobó el archivo privado de 503376 bytes y su huella SHA256, coincidente con el manifiesto generado al exportar. Incluye tablas de aplicación y Auth; roles exportados sin contraseñas de roles PostgreSQL. No se subieron datos, hashes de contraseñas, informes, evidencias ni archivos de respaldo a GitHub. La contraseña de producción nunca se recibió por chat.

Se restauró en PostgreSQL 17.11 local aislado, con credencial aleatoria de prueba, solo 127.0.0.1 y sin conexión remota de escritura. El servidor temporal fue detenido al terminar.

La primera restauración íntegra señaló incompatibilidad de Vault administrado en Windows y del otorgante supabase_admin al reproducir membresías locales. No se ocultó ni se consideró aprobada esa restauración completa.

La segunda prueba restauró en una transacción todo el alcance aplicación/Auth, excluyendo entradas de Vault y sustituyendo únicamente el otorgante supabase_admin por el superusuario local en una copia del SQL de roles. **Roles: salida 0; restauración: salida 0; errores: ninguno.** Archivo original intacto. Verificar-restauracion-local.ps1 deja claro el alcance y conserva logs privados.

Resultado recuperado: 15 tablas públicas, 27 tablas Auth, 7 perfiles, 7 cuentas Auth, 2 informes v238, 1 informe v239 y 0 objetos Storage. Consulta remota confirmó 0 secretos Vault y 0 funciones de aplicación dependientes de Vault.

Límite: esto verifica recuperación de datos/esquema de aplicación y Auth, no una réplica completa de plataforma Supabase ni autenticación end-to-end del proveedor. Vault, secretos externos, configuración de plataforma, correo y Storage externo no se validan por pg_dump. Los componentes administrados originales no se modificaron durante la instalación. Storage no tenía objetos al comprobarlo.

## Instalación remota autorizada

Migración `20261105100847_hys_v241_integracion_aislada`, confirmada en historial remoto. Paquete fuente SHA256: `658ad6d893a3d1b92ae9011d4a2ea7201f28e4f8a5f8fcb929558fe74c8da4a5`.

Se instalaron únicamente esquema privado, tablas, funciones, políticas y triggers v241. Hay **13 tablas nuevas y las 13 tienen RLS**. Se inicializaron 22 áreas; 0 informes v241, 0 ajustes de cuentas y 0 asignaciones delegadas. No se migraron informes históricos ni usuarios.

Se compararon huellas antes/después de tablas originales, políticas, funciones/ACL, triggers, perfiles, permisos, áreas de módulos e informes v238/v239: **las nueve comparaciones coinciden**. Se mantienen 7 cuentas Auth y un único General. Código base v239 y motor PDF conservan sus diez huellas comprobadas por verificar-v241.cjs. main y sitios publicados no se desplegaron ni modificaron en esta etapa.

## Pruebas remotas

- Las 13 tablas v241 tienen RLS.
- Ninguna RPC pública hys241 permite EXECUTE a anon; intento anónimo hys241_contexto rechazado.
- General: contexto correcto, 22 áreas y listado de 7 usuarios.
- Usuario: contexto correcto, 0 facultades/eventos/informes visibles por tabla directa y sin UPDATE directo a cuentas.
- Administrador: contexto correcto, sin asignaciones ni auditorías ajenas.
- Estas comprobaciones usan sesiones SQL autenticadas dentro de transacciones revertidas, sin cambiar perfiles; **no sustituyen un inicio de sesión real por navegador/JWT**.
- No hay Supervisor real disponible; no se crearon ni alteraron cuentas para probarlo. Sus permisos se probaron previamente con identidades sintéticas en la regresión local de 70 grupos.

## Revisión de seguridad

Sin nuevos RPC v241 ejecutables por anon. Continúa el aviso anterior rls_auto_enable y el aviso de protección de contraseñas filtradas deshabilitada. No se cambiaron para preservar el alcance.

El asesor marca 23 funciones SECURITY DEFINER autenticadas frente a 6 previas: 17 RPC nuevas intencionales con autenticación, validación de rol/ámbito y ACL explícitas; siguen requiriendo prueba end-to-end. Invitaciones tiene RLS sin políticas de cliente deliberadamente: solo servicio y RPC autorizadas acceden; denegación por defecto para usuarios.

Referencias del asesor:
- https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable
- https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable
- https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy
- https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

## Bloqueo concreto y siguiente paso

La revisión automática rechazó el despliegue de `admin-users-v241` por requerir autorización explícita para activar una Edge Function con capacidad de invitaciones y credenciales de servicio. **No se desplegó**, la URL devuelve 404 y no se enviaron invitaciones. No se intentó eludir la revisión.

Se requiere autorización explícita para desplegar ese endpoint nuevo, manteniendo intactos clever-function, admin-users y admin-users-v235. Debe configurarse el origen HTTPS independiente y retorno de invitación; sin ellos el código rechaza solicitudes por defecto. Antes de enviar invitaciones reales se comprobarán identidad, ámbito, correo y permisos con cuentas de prueba autorizadas.

HYS241_DEPLOYMENT_READY continúa false. Falta endpoint/configuración, alojamiento HTTPS independiente, activación y pruebas visuales con login real, fotos/PDF, sincronización y desconexión. No se entrega un enlace inexistente ni se presenta v241 como aprobada u operativa.

## Reversión

Mantener v241 desactivada y conservar acceso a v239. No borrar tablas, informes, auditorías o usuarios; no ejecutar DROP como reversión automática. Conservar respaldo privado y scripts de prueba separados del repositorio público.
