# Reportes HYS · v280 — País del documento editable sin referencias
Fecha: 2026-11-08
Base aislada: v279
Estado: desarrollo, sin publicación.

## Cambio solicitado
El campo «País del documento» en la ficha de Información laboral y contacto es ahora un **campo de texto libre obligatorio**, sin autocompletado de países, listas de sugerencias ni país asignado por defecto. Es el usuario quien escribe el país.

## Archivos
- `v280-review/gestion-usuarios-v265.js`: eliminada la lista `datalist`, sin referencias de países; placeholder neutro.
- `v280-review/worker-model-v265.js`: eliminado el valor predeterminado «Chile» de la normalización.
- `v280-review/index.html`: título de prepublicación v280 y versiones renovadas de scripts.
- `v280-review/MANIFIESTO.json`: versión y alcance.

## Validación
- **6/6** pruebas de lógica: país vacío por defecto, texto libre para países no enumerados, campo obligatorio, validez de RUT chileno, restricción del tipo RUT a Chile y código interno autocompletado.
- Sintaxis verificada en módulos modificados y **48** bloques JS embebidos del index.
- Sin test visual en navegador; sin cambios de datos ni servicios reales.

## Límites
Conserva la implementación de v279; el guardado de ficha y administración de turnos aún dependen de integrar el backend propuesto y no se anuncian como disponibles en producción. No se modificaron v279, main, app oficial, Supabase ni versiones protegidas.
