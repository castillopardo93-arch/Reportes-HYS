# Herramienta privada de respaldo

Corrección posterior: el inicio fallaba en Set-Acl por SeSecurityPrivilege antes de mostrar el formulario. Se reemplazó por lectura/escritura exclusiva de DACL (AccessControlSections.Access), sin cambiar propietario ni solicitar auditoría/SACL. Sintaxis PowerShell aprobada y API DACL comprobada en carpeta local sin solicitar privilegios de auditoría. Falta confirmar ejecución completa del formulario por el usuario y exportación; no se declara respaldo realizado.

Se preparó respaldo-privado.ps1 con entrada local enmascarada de contraseña. No contiene credenciales. Destino privado: privado-respaldo-v241/, permisos restringidos al usuario de Windows, excluido de Git junto con herramientas-respaldo/ y archivos dump.

Herramientas PostgreSQL portátiles oficiales 17.11, sin instalar servicios ni cambiar PATH. Fuente enlazada por postgresql.org/download/windows/: https://get.enterprisedb.com/postgresql/postgresql-17.11-5-windows-x64-binaries.zip

SHA256 del ZIP descargado: 80379B2C04D51C30225532E0AE04509899141E9957ED096FE749D7FD9DF8F82F. Huella calculada localmente; no constituye una firma independiente del proveedor.

Verificaciones: sintaxis PowerShell sin errores; pg_dump y pg_restore responden versión 17.11. El formulario se inició y quedó esperando contraseña introducida directamente por el usuario. No se ha acreditado todavía exportación ni restauración.

La contraseña solo se pasa en el entorno del proceso hijo; no en argumentos, archivos, logs ni chat. Conexión al agrupador de sesiones confirmado por el usuario, TLS requerido y transacciones de solo lectura. Se exporta archivo custom completo, se comprueba catálogo del archivo y tablas críticas Auth/perfiles; se intenta exportación de roles sin contraseñas. Errores mostrados sin detalles sensibles. Se genera manifiesto privado con tamaño y hash.

La lectura del catálogo del archivo NO es una prueba de restauración. Antes de instalar v241 hace falta restaurar y validar en un destino separado, además de completar cobertura de dependencias/configuración externa. No se incluyen objetos Storage externos ni secretos de plataforma en pg_dump. No subir respaldos reales al repositorio público.
