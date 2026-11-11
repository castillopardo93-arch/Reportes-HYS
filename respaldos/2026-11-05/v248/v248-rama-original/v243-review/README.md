# Reportes HYS — Vista previa aislada del bloque C01–C10

**Carpeta:** `v243-review/`. **Origen:** copia de trabajo `desarrollo/v243`. **Objetivo:** sitio estático independiente para revisión por el usuario, sin cuentas ni datos reales.

## Reglas explícitas
- El `index.html` de revisión deriva del mismo HTML de v243, conservando tabla Hallazgos, PDF, APR/OTROS y componentes C01–C09.
- Se quitaron del archivo de demostración la autenticación Supabase, el SDK de Supabase, el código administrativo de cuentas, `cloud-v242.js`, `facultades-v242.js` y `operaciones-v242.js`. **Ninguna conexión real** a la base de producción se realiza desde la demo.
- `review-runtime-v243.js` aporta únicamente funciones locales simuladas de `Hys242`; no altera los scripts que se publicarán oficialmente.
- El inicio usa datos ficticios, catálogos de riesgos ficticios y personas con UUID sintéticos. Todo se conserva solamente en almacenamiento del navegador de este sitio independiente.
- Los formularios C03, C04, C05, C06 y la planificación C08 pueden revisarse. Las acciones de ejecución, verificación, cierre, reapertura, reasignación y avisos por correo **siguen bloqueadas** porque requieren el backend de ensayo.
- No utilizar esta demostración para registrar información de trabajadores reales, hallazgos de producción o evidencias sensibles.
- Esta carpeta es de **demostración visual**, no una segunda versión de producción. No se debe copiar el runtime de revisión a `v243/` o `main`.
- El script `build-preview.sh` contiene una lista explícita de archivos públicos permitidos. **No copia los clientes de Supabase ni las funciones administrativas**.

## Validación pendiente
Desplegar en dominio independiente (sin modificar GitHub Pages oficial), comprobar la URL, navegación APR/OTROS, selector, campos, tareas y PDF en navegador real. Este documento por sí solo no confirma que ya exista un despliegue.
