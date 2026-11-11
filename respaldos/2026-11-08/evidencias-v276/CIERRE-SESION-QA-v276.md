# Reportes HYS v276 — Corrección de cerrar sesión en laboratorio QA
Fecha: 2026-11-08
Rama: desarrollo/v276-cerrar-sesion-qa
Base aislada: v275 (69 archivos) 
Estado: desarrollo; pendiente de inspección manual en navegador.

## Diagnóstico confirmado
En la versión anterior, `vista-completa-preview-v265.js` conectaba `authLogout` y `chooserLogout` con `enterModule(null)`. Esta llamada regresaba a las tarjetas pero NO eliminaba el acceso ficticio ni abría la tarjeta de ingreso. En la tarjeta embebida OTROS, `enterModule(null)` devolvía false.

## Correcciones
- Nuevo `qa-sesion-v276.js`, activo exclusivamente en `raw.githack.com/.../v276-review/index.html?qa=1`.
- `Cerrar sesión de prueba` desde el selector de tarjetas y desde Prevencionistas ahora elimina el acceso local del laboratorio, notifica cambio de sesión, limpia el ámbito de Hys242 y abre la tarjeta de ingreso.
- Desde el iframe de Supervisores, capataces y otros, el botón Cerrar sesión avisa al padre con `reportes-hys-switch-user` tras comprobar el mismo origen. El padre ejecuta el cierre.
- `Cambiar módulo` se conserva independiente y no cierra sesión.
- Tarjeta de ingreso QA con `Cambiar contraseña` y `¿Olvidaste tu contraseña?`; el correo de recuperación en QA no envía mensajes, explica la limitación.
- Botón `Volver al laboratorio de prueba` restaura la sesión ficticia sin ingresar credenciales reales.
- Se mantiene la simulación del cambio de contraseña, sin realizar llamadas reales a Supabase.
- `?qa=1&ingreso-demo=1` abre directamente la demostración, pero tras cerrar el acceso ficticio.
- Se actualiza el número a v276 y se añade compatibilidad en el simulador, la verificación local y la interfaz de usuarios.
- Los datos ficticios existentes permanecen almacenados sin borrado destructivo.

## Comprobaciones realizadas
- Sintaxis de los 6 JS involucrados: **6/6 OK**.
- Pruebas de lógica con DOM y servicios simulados: **7/7 OK**.
  - Instalación del botón de salida de QA.
  - Cierre muestra ingreso y borra el acceso de prueba.
  - Restablecimiento del ámbito aislado.
  - Botones de acceso al QA visibles.
  - Apertura de Cambiar contraseña.
  - Retorno desde Cambiar contraseña a ingreso.
  - Volver al laboratorio restaura la sesión ficticia y oculta ingreso.
- El manejo de salida del iframe OTROS ha sido inspeccionado estáticamente, no probado en navegador real.
- No se usó navegador real, no se modificó Supabase ni se probó con credenciales reales.

## Restricciones
- No publicar en `main` ni oficializar sin las pruebas posteriores.
- No tocar versiones protegidas ni Supabase.
- El modo offline/PWA permanece fuera de alcance.
