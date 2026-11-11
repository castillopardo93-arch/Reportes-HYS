> Revisión solicitada: se retiró la portada alternativa. La entrada actual conserva los diez recursos de interfaz v239 y añade global-panel.js. Las mejoras ficticias se muestran dentro de un panel accesible desde la cinta principal; la demostración anterior se conserva bajo global-demo/ como contenido del panel. El cliente real se sustituye por demo-client.js y CSP bloquea conexiones. El simulador heredado puede conservar borradores ficticios locales; la simulación Global sigue en memoria. El servidor mantiene una lista cerrada de recursos y no expone documentación ni pruebas. Las referencias anteriores a una portada propia y ausencia total de almacenamiento describen el primer diseño, ya descartado.

# v240 — Prototipo independiente de Administración Global

4 de noviembre de 2026. Etapa autorizada: prototipo local con datos ficticios. Sin publicación ni conexión a producción.

## Qué es y qué conserva
Esta carpeta contiene una demostración separada, no una sustitución ni actualización de v239. La rama desarrollo/v240 parte de desarrollo/v239 para conservar su referencia; los únicos archivos nuevos de esta etapa están bajo v240/. No se copió el manifiesto de alojamiento ni la configuración Supabase. Las versiones protegidas, main y la web publicada no se editan.

La numeración se revisó antes de crearla: búsqueda remota desarrollo/v240 sin resultados y ninguna carpeta local v240. Después de la autorización de etapa 2 se creó desarrollo/v240. Esta asignación no constituye aprobación del producto ni de despliegue.

## Incluye
- Dos tarjetas independientes y navegación de módulo demostrativa: inferior solo en móvil, disposición normal en escritorio. No modifica formularios reales.
- Portal exclusivo global activo: seguimiento, usuarios, áreas, auditoría e integraciones.
- Creación/edición/desactivación/reactivación de usuarios ficticios. Cuenta propia y globales protegidos; no promoción a global ni borrado.
- Áreas APR/OTROS separadas, duplicados normalizados rechazados; cuatro acciones con trazabilidad en memoria. Históricos ficticios conservan el texto original.
- Filtros combinados de fecha, módulo, proyecto, turno, área, responsable, prioridad y estado; paginación de tres registros.
- Indicadores ilustrativos de pendientes, ejecutadas, vencidos y cumplimiento. Fecha fija 2026-11-04 para resultados reproducibles; un registro por informe, no agregación de informes reales.
- Simulación de revisión con observaciones, control de revisión, rechazo de autoaprobación, preservación del legado y reapertura global. Reglas sujetas a decisión.
- Selector de seis perfiles de demostración: cuatro roles, supervisor de consulta y global inactivo. No es autenticación.

## Aislamiento
No hay SDK, credenciales, peticiones externas, persistencia de navegador ni llamada a Supabase. CSP connect-src 'none'; servidor en 127.0.0.1:8240, con lista cerrada de cuatro archivos públicos. Los datos vuelven al estado inicial al recargar. No se envían invitaciones, no hay contraseñas ni borrado definitivo. Los nombres DEMO y de demostración son ficticios.

## Criterios y pruebas ejecutadas
node test.cjs: 12 grupos aprobados: exclusividad global; protección propio/global; sin escalada de roles; ciclo usuario; límites de ámbito/consulta; cuatro acciones de área con auditoría; duplicados; filtros; indicadores/sin datos; control de legado, versión y autoaprobación; devolución/reapertura; ausencia de conexiones y sintaxis.

Navegador integrado: entrada global visible, filtros APR reducen cuatro informes a dos; creación de usuario ficticio visible; usuario común sin entrada global y sin OTROS; supervisor de OTROS con selector de áreas limitado a OTROS. Vista de 390 px sin desbordamiento horizontal (scrollWidth 375, innerWidth 390; barra de desplazamiento). Se restableció el tamaño al terminar. Captura de pantalla guardada fuera de los archivos de aplicación.

Comprobaciones de protección: hash del motor PDF y diez recursos de v239 coinciden con distribución; 83 archivos de base/v237 y 86 archivos v238 intactos. No se ejecutaron pruebas ni escrituras con cuentas reales.

## Límites y pendientes
El modelo JavaScript valida la simulación, pero no ofrece seguridad de servidor. No reemplaza RLS, auditoría inmutable, autorización de Edge Functions ni autenticación. No hay integración con PDF, fotos, Drive, formularios o informes reales: siguen en v239.

El permiso de edición ficticio se representa con un indicador común para sus módulos; la integración deberá diseñar permisos independientes por módulo. Las métricas usan equivalencias simplificadas y fecha fija; falta aprobar el mapeo de datos reales. Creación/último acceso aparecen como No registrado. Backups se indican como no verificados. No se probó dispositivo físico.

## Revisión y reversión
Abrir index.html o ejecutar node server.cjs y visitar http://127.0.0.1:8240/. Este enlace solo funciona en el equipo local con el servidor activo. No hay web HTTPS nueva.

Revertir la demostración consiste en cerrar su servidor o recargar para restablecer datos ficticios. Conservar la carpeta/rama como evidencia; no borrar ni restaurar bases de datos. La aplicación publicada no necesita reversión porque no cambió.

Etapa 2 terminada para revisión visual. No iniciar conexión real, cambios de seguridad, migraciones, flujo de aprobación real ni publicación sin autorización explícita de otra etapa.
