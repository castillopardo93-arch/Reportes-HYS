# Reportes HYS — v277 · Prepublicación real (sin laboratorio)
Fecha: 2026-11-08
Rama aislada: desarrollo/v277-prepublicacion-real
Base: desarrollo/v276-cerrar-sesion-qa
Estado: desarrollo auténtico de prepublicación, sin publicar.

## Regla permanente definida por el propietario
Por defecto presentar la aplicación tal como debe funcionar en su versión definitiva, con funciones conectadas realmente y sin simuladores ni usuarios ficticios. Cuando una prueba/laboratorio sea necesaria, pedir antes la aprobación explícita. Las funciones no integradas deben señalarse como pendientes, nunca mostrarse como completadas. Cada nueva revisión conserva versionado correlativo aislado y no toca main ni la aplicación oficial ni producción Supabase.

## Acciones aplicadas
- Se creó una copia completamente aislada de v276.
- index.html configura expresamente `HYS266_PREVIEW_ONLY=false`, `HYS265_PREVIEW_ONLY=false`, `HYS265_LAB_MODE=false`, `HYS263_SANDBOX=false` y demás banderas de demostración.
- Se retiraron del **cargador principal** los scripts: `backend-simulador-v263.js`, `vista-completa-preview-v265.js`, `areas-opciones-qa-v265.js`, `verificacion-punto3-v266.js` y `qa-sesion-v276.js`, además de su CSS de pruebas.
- El sistema principal ahora utiliza el flujo de autenticación normal Supabase Auth, incluyendo cierre de sesión real y cambio de contraseña.
- Se conserva la protección original de escritura `HYS242_DEPLOYMENT_READY=false`, `HYS242_ENABLE_CENTRAL=false`; no se activan RPC de mutación ni publicación.
- `HYS250_LOCAL_EDIT=true` conserva consulta del contexto real del usuario en servidor y edición local de desarrollo. Los permisos proceden de `hys242_contexto` en lugar de la cuenta ficticia.
- Interfaz denominada `v277 · Prepublicación`.

## Qué es realmente funcional y qué sigue pendiente

**Implementado en frontend y conectado al backend existente (requiere comprobación con cuenta autorizada):**
- Iniciar sesión/cerrar sesión con Supabase Auth.
- Consultar perfil y permisos mediante `hys242_contexto`.
- Cambio de contraseña desde el ingreso mediante cliente temporal.
- Pantallas principales, formularios, herramientas de PDF y edición local.

**No se considera listo para uso operativo central:**
- Alta y edición de usuario en el nuevo formulario unificado v265: `save()` bloquea escritura real.
- Contraseña automática/manual v274: diseño de formulario implementado, pero crear acceso real desde el asistente unificado aún no está integrado de manera transaccional.
- Guardado central de informes, historial centralizado, cierre y revisiones: banderas de producción inactivas hasta pruebas e integración.
- Validación real de todas las operaciones de ambos módulos, móviles y PDFs.

No se debe confundir un borrador **local** con un informe ingresado en la base de datos central. No registrar datos operativos definitivos en esta versión sin la validación correspondiente.

## Verificación efectuada
- Se confirmó que **52 referencias** relativas a CSS/JS/assets del index apuntan a archivos existentes en la copia.
- Los **46 bloques JavaScript embebidos** pasan validación de sintaxis.
- Confirmado el no cargado de simuladores en la pantalla principal v277.
- Comprobación de solo lectura sobre la conexión Supabase existente: hay tablas RLS y RPC de gestión, informes y facultades, además de las Edge Functions `admin-users` y `admin-users-v242`. La existencia de estas funciones no equivale a integración completa del nuevo formulario.
- NO se ejecutaron pruebas reales en navegador ni se creó/modificó cuenta, contraseña o informe.

## No tocado
- main, aplicación publicada y versiones protegidas.
- Supabase de producción (sin escrituras, despliegues ni cambios de esquema).
- Modo offline/PWA (pendiente para fase separada).

## Para completar la funcionalidad legítima
Definir un entorno de backend aislado de pruebas **real**, separado de producción, que permita altas de usuarios, contraseñas, permisos, informes y notificaciones E2E sin riesgo. Esto requiere autorización para crear/configurar servicios adicionales; ninguna operación ha sido realizada automáticamente.
