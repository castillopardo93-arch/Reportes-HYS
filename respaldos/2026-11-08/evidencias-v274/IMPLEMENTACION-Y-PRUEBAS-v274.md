# Reportes HYS v274 — Contraseñas de acceso en alta de usuarios

**Fecha:** 2026-11-08  
**Base:** `desarrollo/v273-correcciones-auditoria` (67 archivos copiados sin sobrescribir versiones previas).  
**Estado:** Desarrollo y laboratorio ficticio. No aprobado para producción.

## Cambio de interfaz

En `Gestión de usuarios > Crear usuario > Paso 2: Creación de cuenta`:

- Método predeterminado: `Generar contraseña automática`.
- Se genera una contraseña aleatoria de 20 caracteres con `crypto.getRandomValues`, cubriendo mayúsculas, minúsculas, números y símbolos. Incluye **Generar otra contraseña**.
- Método `Crear contraseña manualmente`: el campo se vuelve editable, tiene confirmación, mostrar/ocultar y validación de 12–128 caracteres, los cuatro grupos y prohibición de espacios.
- Método `Invitación por correo`: queda disponible pero no se dispara ningún correo en laboratorio.
- Botones `Copiar acceso` y `Compartir acceso` con el correo elegido y contraseña. Compartir utiliza `navigator.share` si está disponible y si no, intenta copiar.
- Al guardar una cuenta ficticia, la pantalla de **Entrega de acceso** muestra el secreto de la sesión hasta que se finalice o cierre.
- La contraseña temporal reside solo en variables de memoria del formulario, no se incluye en `state.draft`, payload del simulador, registro de usuario, `localStorage` ni auditoría.
- Los roles dinámicos permanecen desactivados.

## Seguridad y límites

- `credentials-v274.js`: módulo de generación, validación y presentación de acceso. Sin `Math.random` para contraseñas.
- `worker-model-v265.js`: el validador de cuenta **solo retorna** `correo_ingreso`, `metodo`, `email` y `estado`; descarta secretos adicionales.
- `gestion-usuarios-v265.js`: el secreto efímero se borra al abandonar el formulario, cerrar o perder facultades.
- Se conserva el guardado real bloqueado (¡no se crea ninguna credencial utilizable en Supabase!). **La existencia de botones de entrega no implica un alta real.**
- El servicio futuro deberá gestionar contraseñas con Supabase Auth de forma segura, forzar cambio inicial y registrar solamente la entrega, nunca el valor en el historial.
- El modo offline/PWA sigue excluido y no se cambió Supabase, producción, `main` ni versiones protegidas.

## Comprobaciones ejecutadas

13 pruebas de estructura y lógica mediante ejecución aislada de JS:
- Sintaxis de `credentials-v274.js`, `worker-model-v265.js`, `gestion-usuarios-v265.js`, `backend-simulador-v263.js`: 4/4.
- Generación de 200 contraseñas de 20 caracteres, validación de complejidad y no repetición en muestra: 1/1 (entorno con fuente pseudoaleatoria **solo de prueba**, no sustituye criptografía real).
- Rechazo de confirmación manual errónea: 1/1.
- Rechazo de contraseña débil: 1/1.
- Admisión de invitación sin clave: 1/1.
- Limpieza de campos de secreto por `validateAccount`: 1/1.
- Presencia de UI de métodos, copia, compartir y entrega: 1/1.
- Orden de carga de scripts: 1/1.
- Lista de rutas QA v274 en index, formulario y simulador: 1/1.
- Sin campos explícitos de contraseña en payload y cuenta normalizada: 1/1.

**Total: 13/13 en pruebas estáticas y de lógica.** No son pruebas E2E.

## Pendientes antes de autorizar uso real

1. Verificar visualmente en navegador que los controles se comporten correctamente, incluyendo móvil.
2. Probar copia, compartir y descarte al cambiar de sección.
3. Revisar con Supabase Auth la operación administrativa segura de alta con contraseña temporal y cambio obligatorio en primer ingreso.
4. Confirmar que únicamente el administrador autorizado puede crear cuentas y que RLS/RPC respetan facultades y áreas.
5. Hacer pruebas de regresión con usuarios reales **solo en un entorno seguro y con aprobación específica**.

La automatización remota del navegador no pudo iniciarse por falta de saldo en la herramienta de pruebas. Se requiere verificación manual o alternativa disponible.
