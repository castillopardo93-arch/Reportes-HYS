# Reportes HYS v275 — Cambio de contraseña desde la tarjeta principal de ingreso
Fecha: 2026-11-08
Rama: desarrollo/v275-cambio-contrasena-ingreso
Base: desarrollo/v274-metodos-contrasena
Estado: desarrollo, sin publicación.

## Necesidad
Agregar «Cambiar contraseña» junto a «¿Olvidaste tu contraseña?» en la tarjeta principal de ingreso, sin depender de correos si el usuario recuerda su contraseña actual.

## Cambios
- Nueva acción visible «Cambiar contraseña» en la tarjeta de inicio.
- Formulario independiente con correo de ingreso, contraseña actual, nueva contraseña y confirmación.
- Mostrar/ocultar los tres campos; volver al ingreso sin enviar datos.
- Validación local de 12–128 caracteres, mayúsculas, minúsculas, números, símbolos, sin espacios, confirmación correcta y nueva distinta de la anterior.
- Cambio real solo bajo acción consciente del usuario: inicia sesión mediante `signInWithPassword` en cliente Supabase Auth **separado**, con `persistSession:false`, `autoRefreshToken:false`, `detectSessionInUrl:false`; luego `updateUser({password,current_password})`. Por último se ejecuta `signOut({scope:'local'})` sobre la sesión separada.
- No se almacena ni registra ninguna contraseña en localStorage, sessionStorage, auditoría ni reportes.
- La recuperación por correo existente se conserva sin modificación.
- Los mensajes de error evitan imprimir datos sensibles o errores técnicos internos.
- Se desactiva la acción en el iframe OTROS y en páginas de recuperación de cuenta.
- Vista de demostración de login en `/v275-review/index.html?qa=1&ingreso-demo=1`: validación local ficticia, sin uso de Supabase real.
- Interfaz móvil desplazable verticalmente si no cabe en pantalla.
- `MANIFIESTO.json` y rótulo del inicio actualizados a v275.

## Pruebas de código
- Sintaxis JS correcta y estructura de formulario verificada.
- Pruebas con cliente Supabase simulado: 7/7:
  1. Apertura de formulario con correo previamente escrito.
  2. Rechazo de contraseña débil antes de solicitar autenticación.
  3. Cambio usando cliente sin persistencia y cierre de sesión temporal.
  4. Envío de contraseña actual al cambio Auth.
  5. Regreso a inicio conservando correo.
  6. Contraseña actual incorrecta impide actualización.
  7. Vista QA no efectúa operaciones Auth.
- Inspección HTML: IDs únicos, scripts en orden, CSS y rutas QA presentes, sin secretos de backend.
- No se ejecutaron pruebas E2E reales, no se efectuó cambio de contraseña en Supabase ni se modificó su configuración.

## Consideraciones de seguridad
- El cambio real requiere correo + contraseña actual correctos.
- En caso de configuración especial de Supabase Auth que exija reautenticación por correo, el backend podría rechazar el cambio; mostrar orientación al usuario, sin intentar enviar correos automáticamente.
- El código usa la versión de supabase-js ya instalada (2.49.8); el atributo `current_password` se transmite en el objeto de actualización y debe comprobarse funcionalmente en un entorno seguro. La documentación más reciente tipa el atributo explícitamente en versiones posteriores. No se actualizó la biblioteca para evitar regresiones en la aplicación.
- El modo offline/PWA continúa fuera de alcance.

## Estado y próximos pasos
- No publicar hasta revisar en navegador real escritorio/móvil y validar con una **cuenta de prueba** en un entorno controlado.
- No tocar main, versiones aprobadas o protegidas ni producción sin una decisión específica.
