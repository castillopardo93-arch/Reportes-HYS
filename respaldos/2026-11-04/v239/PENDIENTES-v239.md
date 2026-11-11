# Pendientes v239

- Publicar el entorno HTTPS de revisión requiere la autorización expresa solicitada; la versión conectada se guarda sin despliegue.
- Pruebas generales desde el navegador con cuentas autorizadas. El guardado, permisos y auditoría ya se probaron directamente en Supabase con transacciones revertidas.
- No existe un perfil Supervisor en el proyecto. Su cobertura está en las pruebas locales ficticias; no se crearon ni modificaron usuarios reales.
- Administrador de Área no tiene acceso actual a OTROS en los perfiles disponibles; se respetó ese ámbito.
- Los perfiles de usuario seleccionados para la prueba remota tenían permiso de consulta; la prueba confirmó el rechazo de escritura. No se ampliaron permisos.
- Visor PDF nativo y límites de informes con muchas fotografías: revisar en los navegadores objetivo.
- No se migraron informes históricos de v238 ni se modificó la aplicación oficial.
