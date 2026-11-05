# Reportes HYS v242

Copia independiente basada en v241, creada el 5 de noviembre de 2026 tras comprobar numeración libre. Rama pública `desarrollo/v242`, carpeta `v242/`. Base remota protegida: `078366a3b5dd4f0700622a999ef5fd15fee590fb`.

**Instalada en componentes independientes y publicada para revisión:** https://reportes-hys-v242-revision.freshfennel.chatgpt.site/ . `HYS242_DEPLOYMENT_READY=true`. Consulta INSTALACION-PUBLICACION-20261105.md para evidencia y pendientes. Es código real con autenticación Supabase, sin simulador ni cuentas ficticias en la aplicación.

Se conservan la interfaz de v241, dos módulos, formularios, fotos, PDF, navegación de escritorio/móvil y roles internos. La administración de invitaciones se incorpora a Usuarios. Motor PDF idéntico y doce recursos de v241 comprobados mediante SHA256. No se cambian main, v241, versiones protegidas, usuarios, informes ni credenciales existentes.

Consultar [CAMBIOS-PRUEBAS-v242.md](CAMBIOS-PRUEBAS-v242.md) para resultados, límites, criterios de aceptación e instalación pendiente. El respaldo descargable de esta etapa contiene código/documentación/pruebas; no es un respaldo de datos de Supabase.

## Uso de desarrollo

Dependencias fijadas en pnpm-lock.yaml. Instalarlas en esta carpeta si se ejecuta el paquete fuera del workspace original. Las pruebas buscan dependencias locales primero y, como respaldo del workspace, las ya instaladas en la copia v239; no alteran esa copia.

`node verificar-v242.cjs` verifica la base protegida y sintaxis. `node build-v242.cjs` genera dist con doce recursos y manifiesto. Los archivos de pruebas y SQL no se incluyen en dist.

No activar config-v242.js ni ejecutar SQL remoto antes de aprobar la instalación y comprobar inventario, respaldo vigente y configuración de origen/correo. No reutilizar identificadores de alojamiento de v241.
