# v242 — Preparación de instalación autorizada

El usuario autorizó instalar los componentes v242, desplegar admin-users-v242 y publicar un enlace HTTPS público independiente.

Inventario previo: 28 tablas públicas; 0 tablas v242; 7 usuarios Auth, un único General, 0 objetos Storage y **1 informe v241**. Ese informe apareció después del respaldo manual del 5 de noviembre a las 00:03 UTC. El respaldo previo conserva su hash y su restauración de aplicación/Auth aprobada, pero no acredita recuperar este informe reciente.

Se solicitó al usuario actualizar el respaldo mediante ABRIR-RESPALDO.cmd, introduciendo la contraseña únicamente en el formulario privado. **La instalación SQL y el despliegue del endpoint siguen pendientes de esa actualización y su comprobación.** No se recibió ni persistió la contraseña en esta preparación.

Se creó un alojamiento separado: `appgprj_6aec653e475c81919858fd22548befd3`, con audiencia pública explícitamente autorizada. Identidad persistida en Sitio-HYS-v242/.openai/hosting.json. Dirección esperada: https://reportes-hys-v242-revision.freshfennel.chatgpt.site. **Todavía no se ha publicado ninguna versión; la URL esperada no es un enlace operativo confirmado.** No se reutilizó el sitio v241.

Se incorporó al código del endpoint el origen exacto obtenido del alojamiento, sin credenciales: valores por defecto de origen/retorno v242, con opción de sobreescritura por variables del servidor. Una variable explícitamente vacía deshabilita la configuración. Se repitieron los 13 grupos del handler y todos pasaron, incluido rechazo de retorno vacío/ajeno antes de preparar solicitudes. Esta configuración de despliegue es posterior al paquete inicial de correcciones.

Se tomaron huellas previas de tablas, políticas, funciones/ACL y triggers protegidos, incluyendo v241, para comparar después de la instalación. No se aplicó SQL de escritura ni se modificaron perfiles, informes, funciones anteriores o la aplicación oficial en esta preparación.

Siguiente paso: verificar el nuevo respaldo, probar recuperación de su alcance aplicación/Auth y conservar datos anteriores; instalar únicamente v242, verificar seguridad/endpoint, activar y publicar su versión independiente. Correo real, allowlist de retornos Supabase y pruebas autenticadas de los cuatro roles no se consideran aprobados sin comprobarlos.
