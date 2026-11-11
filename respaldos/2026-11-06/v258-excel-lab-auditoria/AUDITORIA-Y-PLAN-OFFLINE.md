# Auditoría y correcciones del laboratorio Excel basado en v258
Fecha: 2026-11-06

## Base y protección
Origen exacto: `desarrollo/excel-v258-integracion-pruebas` (derivada de `desarrollo/v258`, carpeta `v258-review`).
Rama nueva: `desarrollo/excel-v258-auditoria-offline`.
No modifica `v258-review`, v258 de Work, main, aplicación oficial, usuarios ni Supabase.

## Incidencias identificadas y corregidas
1. **Autorización insuficiente en el exportador:** antes bastaba tener `userId` y módulo seleccionado. Ahora exige perfil activo y que el módulo pertenezca a los módulos autorizados.
2. **Cambio de permisos durante la lectura:** antes el control de sesión no distinguía cambios de facultades. Ahora la huella incluye rol, módulos, permisos, facultades y sesión; una alteración interrumpe la exportación.
3. **Fuga visual posible al cambiar usuario/módulo:** el resumen de la sesión anterior podía quedar visible. Ahora se limpia al cambiar o actualizar la sesión.
4. **Registros sin ID fusionados por error:** informes diferentes del mismo día, área y turno podían contarse como uno. Ahora se distingue por el contenido cuando falta ID.
5. **Riesgos repetidos dentro de un mismo hallazgo:** una selección duplicada podía aumentar artificialmente la frecuencia. Ahora un mismo riesgo se cuenta una sola vez por hallazgo.
6. **Archivo histórico v258 bloqueado:** se agrega advertencia de bloqueo de IndexedDB; se mantiene el acceso `readonly` y sin escrituras.
7. **Contenido XML Excel:** se filtran caracteres de control y sustituyen pares sustitutos Unicode inválidos para evitar archivos XLSX corruptos.
8. **Alcance del resumen:** se aclara que se usan únicamente los registros disponibles en el navegador y que no equivale al inventario central de la empresa.

## Pruebas realizadas
- 11/11 controles adicionales con datos ficticios: deduplicación por ID, registros sin ID, riesgo repetido, atraso, responsable, actividad vinculada, ausencia de accidentes inventados, estructura ZIP, bloqueo de perfil inactivo, bloqueo de módulo no permitido y abortar tras cambio de permisos.
- En la rama anterior ya existían 27 comprobaciones preliminares de lógica XLSX y ámbito de lectura; no constituyen pruebas integrales reales en navegador.
- La revisión de referencias CSS/JS y sintaxis JavaScript queda registrada en la comprobación final.
- **Pendiente:** sesión real APR/OTROS, archivo XLSX abierto en Microsoft Excel, visual y pruebas móviles, rendimiento con fotos/reportes reales, regresión PDF, vista offline real y recuperación tras cierre de app.

## Diagnóstico de modo offline
**No está listo para activarlo aún.** Actualmente la aplicación no registra un Service Worker ni manifiesto PWA en el HTML del laboratorio y depende de bibliotecas CDN (PDF y Supabase) y autenticación que requieren conectividad durante el arranque.
El almacenamiento local de borradores ya existe, pero esto NO hace que todo el sitio funcione offline.
Plan de trabajo seguro:
A. Aislar la copia de desarrollo e inventariar todos los recursos/archivos de la app, incluidos PDF y fotografías.
B. Versionar y servir desde el mismo origen las bibliotecas imprescindibles, instalar un Service Worker con caché de shell de recursos estáticos y aviso claro de estado de conexión.
C. Permitir solamente sesión previamente autorizada según reglas verificables; no conceder permisos a partir de valores manipulables en caché.
D. Guardar borradores y fotos en IndexedDB por usuario/módulo/proyecto; proteger contra duplicados, edición concurrente y fallo de almacenamiento.
E. Implementar cola de sincronización idempotente con confirmación real del servidor, conflictos y rechazo por cambios de permisos al volver Internet.
F. Probar Android/iPhone, reinicio con modo avión, caducidad de sesión, cambios de usuario, múltiples módulos, PDFs, fotos, datos sin sincronizar, capacidad de caché.
G. NO afirmar sincronización offline completa ni publicar hasta superar las pruebas.

**Decisión actual:** no se ha instalado ni registrado Service Worker. Primero corregir la exportación, probar integridad de datos y luego comenzar una etapa separada y aislada para offline.
