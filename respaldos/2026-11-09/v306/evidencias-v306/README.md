# Reportes HYS — Investigación de accidente v306

Versión aislada a partir de v305 (`813b0623a3401260c98fc6821b44726582108c40`). Rama `desarrollo/v306-flash-final-formularios`.

## Requisito implementado
Se cambia el rótulo de la cinta lateral por **Investigación de accidente** (singular). Al seleccionar la opción aparecen **dos tarjetas**: **Flash Report** y **Final Report**. Ambas abren formularios individuales basados en las hojas del libro **HSS-RGT-007 — Rev. 08** aportado por el usuario.

### Hoja Flash Report
Se recogen tipo de incidente, probabilidad de lesiones con tiempo perdido, hora/fecha, área, ubicación, involucrado/cargo/RUT, responsables de área, primeros auxilios, ambulancia, hospital, paramédico y director médico, existencia de testigos y 3 fichas, fotos, descripción de hechos conocidos, causas aparentes inmediatas, acciones inmediatas y responsables de comunicación/preparación del informe.

### Hoja Final Report
Se conservan: (1) Antecedentes generales; (2) Antecedentes adicionales (preguntas originales del libro); (3) Declaraciones con tres fichas y resumen; (4) Descripción; (5) Fotografías; (6) Procedimientos; (7) Matriz de peligros y riesgos; (8) Capacitaciones; (9) Análisis de causas en sus tres subcategorías; (10) Planes de acción. Se agrega al final la ficha del equipo investigador y aprobaciones para reproducir el pie de hoja.

### Catálogos y Excel
El libro tiene cuatro hojas: `Lista`, `Flash Report`, `Final Report`, `Tabla`. Se implementan por ahora opciones **locales y provisionales** para tipo de incidente, probabilidad, respuesta sí/no y tipo de pérdida, y sugerencias de área. Estas opciones **no modifican las áreas ni catálogos existentes** en Supabase. La conexión dinámica con Excel, administración y los códigos de causas 1.x, 2.x y 3.x quedan pendientes por indicación del usuario; no se simula que ya estén vinculados.

### Protección
- Formulario editable de demostración, sin `save` ni `insert` / `update` / `rpc`, sin persistencia en `localStorage`.
- Datos e imágenes permanecen únicamente en memoria del navegador y se limpian al cerrar/cambiar de sesión; se advierte antes de cerrar si hay cambios.
- `Guardar reporte` está deshabilitado hasta definir almacenamiento seguro, autorización y auditoría.
- No se procesan ni generan firmas electrónicas, notificaciones externas ni PDF de investigación todavía.
- Sin cambios de `main`, Supabase ni aplicación oficial.

## Validación
Pruebas nuevas en `evidencias-v306/test-flash-final-v306.cjs`, regresiones de v305 a v284 y comprobación de aislamiento de 98 archivos.
