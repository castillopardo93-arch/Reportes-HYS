# Reportes HYS — Demostración aislada v244 (D + E)

**Rama:** `desarrollo/v244`, **carpeta:** `v244-review/`.

Esta revisión usa copia autónoma de v244 con cuentas ficticias, sin SDK, URL ni claves de Supabase. Se mantiene aislada de la publicación oficial y de la revisión v243, previamente aprobada.

**Nuevas pruebas visuales:** Actividades HYS y Actividades por área ahora tienen clasificación informativa/tarea, fecha compromiso, vínculo opcional a Hallazgos y selector ficticio de persona registrada APR. La tabla histórica y el PDF conservan los cuatro campos originales y fotografías. En Configuración se incorpora un panel plegable de fichas con cargo/teléfono/correo/preferencia de contacto, áreas operativas ficticias por módulo y espacio vacío de auditoría.

**Limitaciones:** todo es ficticio, solo los datos de formulario histórico se guardan localmente; las modificaciones de fichas y áreas operativas se mantienen exclusivamente en memoria y desaparecen al recargar. Los avisos, acciones reales, verificación, reasignación, cierre formal, permisos RLS y auditoría central siguen deshabilitados.

**Construcción:** `sh v244-review/build-preview.sh` copia una lista explícita de recursos seguros desde `v244/`. No copiar archivos de administración de Supabase, claves ni SDK real. **No** publicar este directorio como aplicación oficial.

La vista v244 requiere una nueva revisión visual: la aceptación de v243 no la aprueba automáticamente.
