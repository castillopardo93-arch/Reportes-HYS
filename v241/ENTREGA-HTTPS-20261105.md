# v241 — Función desplegada y alojamiento independiente

Estado 5 de noviembre de 2026. Informe posterior a INSTALACION-BASE-20261105.md.

## Cambios

- Desplegado únicamente admin-users-v241, versión 1. La identidad se valida mediante auth.getUser y cada acción vuelve a comprobar permisos en RPC. verify_jwt=false corresponde a esa validación explícita del handler, necesaria también para OPTIONS; no concede acceso sin sesión.
- Origen HTTPS exacto: https://reportes-hys-v241-revision.freshfennel.chatgpt.site. Retorno de invitación al mismo origen. Se permite configuración por variables del servidor; no hay secretos en el código. CORS no utiliza comodines.
- Funciones previas conservan sus hashes de código. No se enviaron correos, crearon cuentas ni cambiaron perfiles para probar el endpoint.
- Activada únicamente configuración de distribución v241: HYS241_DEPLOYMENT_READY=true. Se mantienen namespace, borradores, tablas y Auth propios de v241.
- Sitio nuevo appgprj_6aec57499d1c81918888a06af9ad302c, separado de v238/v239. Manifest de alojamiento en Sitio-HYS-v241/.openai/hosting.json; allí solo se copian doce recursos runtime y manifiesto de huellas. Ningún respaldo privado en alojamiento o GitHub.

## Pruebas

HTTP real del endpoint: origen ajeno rechazado 403; origen correcto sin sesión rechazado 401; OPTIONS origen correcto 200 y Access-Control-Allow-Origin exacto. No se usaron credenciales personales.

Se repitieron 6 grupos del handler, 23 del runtime y 3 PDF sintéticos (10, 12 y 4 páginas), todos aprobados. Integridad de los diez recursos protegidos v239 y motor PDF idéntico comprobada. Pantalla local de acceso v241 observada en navegador: correo, contraseña, Ingresar y recuperación de acceso visibles, sin errores de carga detectados en esa observación.

Límites: falta prueba de login/JWT real con los cuatro roles y revisión visual autenticada de formularios/móvil, sincronización de datos reales, correo y retorno de invitación. No se alteraron perfiles reales para esas pruebas. Los informes históricos v239 siguen en v239; no se copiaron a v241.

## Audiencia y seguridad

El repositorio GitHub es público y conserva código/pruebas/documentación. Respaldos reales permanecen privados fuera del repositorio.

La revisión automática rechazó ampliar el sitio nuevo a audiencia pública por falta de autorización específica para ese cambio. No se eludió el rechazo; se mantuvo el acceso privado del propietario. La autorización de publicar el repositorio no se interpreta como autorización para cambiar la audiencia del sitio.

Publicación privada confirmada: revisión exacta del alojamiento `6ab09d2c187b4614f83d2a6397a73fb0d2801406`, versión `appgprj_6aec57499d1c81918888a06af9ad302c~appgver_a9408892eda08191ac4c98d5ebdecb44`, despliegue `appgdep_6aec588a3e9881919fbc23017df3e8c6`, resultado succeeded. Enlace: https://reportes-hys-v241-revision.freshfennel.chatgpt.site/.

Observación en navegador remoto: pantalla «Inicia sesión para acceder» de ChatGPT, propia del alojamiento privado. No se declara vista autenticada de Reportes HYS ni acceso público. La pantalla propia de Reportes HYS sí se comprobó en el preview local del mismo runtime. La apertura pública continúa pendiente de autorización explícita; aún no se cumple el requisito de apertura sin ChatGPT. Falta verificar configuración de retornos autorizados en Supabase antes de considerar probadas invitaciones y recuperación de contraseña.

## Reversión

Desactivar exclusivamente HYS241_DEPLOYMENT_READY y conservar datos v241; regresar al enlace protegido v239. No borrar usuarios/informes/tablas ni sustituir las funciones administrativas anteriores. No se modifica main ni el alojamiento oficial.
