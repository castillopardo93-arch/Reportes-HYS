# Pruebas de estabilización v239

Fecha de revisión: 2026-11-03, America/Santiago. Estado: validación local aprobada; integración remota v239 pendiente.

Los resultados reproducibles están en RESULTADOS-PRUEBAS-v239.json y PRUEBAS-NAVEGADOR-v239.json. Ninguna prueba usa perfiles ni informes reales.

| Conjunto | Casos / resultado |
|---|---|
| Autenticación | 38 escenarios simulados: roles, destinos, sesión, revocación, cierre, recuperación y respuestas tardías |
| Administración de usuarios | 20 escenarios de interfaz simulada, sin invocar cambios de cuentas reales |
| Apariencia | 10 validaciones del modelo: contraste, colores, iconos, logos y rechazo de contenido arbitrario |
| Inicio y PDF | 9 comprobaciones: siete campos obligatorios y período válido |
| Aislamiento | 12 comprobaciones de almacenamiento por usuario/módulo y claves protegidas, más huella canónica |
| Cola durable | 6 escenarios: desconexión, edición durante envío, conflicto, revisión, respuesta perdida y aislamiento |
| Runtime de aplicación | 23 escenarios sobre las funciones reales: 4 roles × 2 módulos con IndexedDB fallido; 3 roles de consulta × 2 módulos; cuota, finalización, nuevo informe, usuario cambiado durante guardado, nombre protegido y activación central bloqueada |
| PostgreSQL local | 31 escenarios en PGlite: RLS y RPC con cuatro perfiles ficticios; permisos efectivos, ámbitos, nombre original/actor, idempotencia, conflictos, PDF, catálogos y auditoría; los perfiles de consulta tampoco pueden crear áreas |
| Flujo PDF | APR y OTROS: instantánea estable, archivo y reutilización de los mismos bytes al descargar/compartir; transporte simulado |
| PDF real | 3 documentos con jsPDF 2.5.1: APR 10 páginas, OTROS 12 páginas y texto extenso 4 páginas; fotos, categorías, límites y conservación de registros breves comprobados |

## Verificación en navegador

- Usuario, Supervisor, Administrador de Área y Administrador Global pudieron completar Inicio, agregar registros y finalizar en APR y OTROS, con datos ficticios.
- El nombre del responsable quedó bloqueado en los tres roles ordinarios y editable en Global.
- Los escenarios de solo lectura bloquearon los controles de Inicio, agregar, editar, eliminar, finalizar, nuevo informe, importar y restaurar en ambos módulos.
- Usuario APR: actividad con PNG, vista previa de evidencia, ampliación, finalización durante interrupción de red simulada; permaneció el registro y se mostró pendiente central. Después se reconectó y se descargó el PDF.
- OTROS: categorías y estado provenientes del catálogo simulado, hallazgo finalizado y conservado al recargar la sesión; no apareció información de APR.
- Fallo de IndexedDB: edición con respaldo alternativo; al restablecer el almacenamiento se recuperaron los dos hallazgos. Un conflicto se conservó como informe nuevo y el original central simulado permaneció con su registro anterior.
- Nuevo informe dejó el formulario vacío sin retirar el informe finalizado del historial. Un finalizado sin PDF pudo volver a cargarse desde Reportes Anteriores.
- La última revisión de navegador no registró errores de consola. Los errores de referencias al formulario OTROS retirado que aparecieron durante el desarrollo fueron corregidos.

## PDF y revisión visual

Se descargó un PDF desde la app y se comprobó texto, estado y evidencia. También se renderizaron las páginas de los tres documentos de estrés con PDFium: encabezados, pies, numeración, fotografías y continuidad revisados. Las actividades breves con sus fotos se mantienen juntas; registros de más de una página continúan con su encabezado.

El visor PDF nativo del navegador integrado mostró el marco de vista previa pero no dibujó su contenido. La descarga produjo un PDF válido que se renderizó fuera de ese visor. Revisar el visor nativo en los navegadores objetivo; no se afirma que esa representación se haya validado visualmente en todos ellos.

## Protección

Se comprobaron 86 archivos de la copia local v238 idénticos a su estado antes de iniciar v239, y 83 archivos de las bases protegidas v236/v237. Main remoto se mantuvo en f1373e9b2fec8252a3da1de08ab33acce8ae974e. La rama v238 de origen se conserva en 71d10f066d6b2d374cdce6254cd9124083b9d535.

Supabase real se inspeccionó mediante SELECT: 7 perfiles, 8 permisos y 2 informes v238. No se aplicaron migraciones ni escrituras de prueba.

## Límites de la aprobación local

No se ha desplegado v239 ni se ha activado su esquema en Supabase remoto. Configuración de Auth del nuevo origen, transporte HTTP/RPC, límites de payload grandes y pruebas con cuentas de desarrollo reales requieren el entorno autorizado. Las pruebas locales de PostgreSQL validan las reglas SQL propuestas, no sustituyen una prueba de integración remota.
