> Actualización: el usuario autorizó conectar Supabase para pruebas generales. Se instalaron y verificaron los objetos aislados v239 y se activó config-v239.js. Ver CONEXION-SUPABASE-v239.md. El despliegue HTTPS de la app sigue sin publicar. Los estados anteriores de este documento describen la revisión inicial.

# Reportes HYS v239 — registro de estabilización

Estado: copia de desarrollo preparada para revisión; NO aprobada ni publicada. Fecha: 2026-11-03 (America/Santiago).
Origen exacto: desarrollo/v238, commit 71d10f066d6b2d374cdce6254cd9124083b9d535. La corrección local inconclusa de v238 no se publicó ni se usó como base remota.

| Error confirmado en v238 | Corrección en v239 | Archivos principales | Verificación |
|---|---|---|---|
| Los permisos de edición se consultaban después de abrir el almacenamiento; un fallo podía dejar los campos desactivados | Permisos efectivos obtenidos al autenticar, con área de permisos activa; inicialización con tiempo máximo y respaldo alternativo | index.html, cloud-v239.js | Runtime: 4 roles por 2 módulos, IndexedDB fallido; navegador |
| El bloqueo omitía editar/eliminar registros, importar y restaurar | Controles desactivados, bloqueo de eventos y guardas dentro de operaciones; RLS/RPC mantienen la autoridad | index.html, cloud-v239.js, SQL propuesto | 6 escenarios de consulta en navegador, runtime y PostgreSQL local |
| Finalizar limpiaba tarjetas antes de confirmar la conservación y un guardado posterior podía sustituir la versión final | Se conserva la misma pantalla; Finalizar guarda copia y cola juntas; Nuevo informe es una acción independiente y atómica | cloud-v239.js, sync-core-v239.js, index.html | Desconexión, cuota llena, cambio de usuario durante escritura |
| Borrador, instantánea final y PDF usaban identidades diferentes | ID v239 único para las tres etapas; solo Nuevo informe o Conservar conflicto como nuevo cambia el ID | index.html, cloud-v239.js, SQL | Runtime, PostgreSQL local, PDF y navegador |
| Un supervisor editando un informe podía sustituir el responsable por su propio nombre | Responsable protegido por sesión; servidor conserva el nombre del informe existente y registra aparte el actor real; Global puede cambiarlo | cloud-v239.js, SQL | PostgreSQL: edición por supervisor, Global y acceso ajeno |
| Un JSON importado podía introducir catálogos y alterar el responsable mostrado | Los catálogos proceden del ámbito autenticado; un nombre importado no sustituye al responsable protegido | index.html, cloud-v239.js | Aislamiento y runtime |
| Parte del estado de sesión se compartía entre usuarios; el módulo recordado no se leía al recargar | Espacios v239 por usuario/módulo; selección del módulo bajo clave de sesión por usuario; escrituras tardías capturan su ámbito | storage-v239.js, index.html | test-storage-v239.cjs y recarga real de OTROS |
| Reportes Anteriores descargaba todos los payloads y PDF en bloques sucesivos | 20 resúmenes por página; archivo completo solo al abrir/editar/descargar; incluye finalizados sin PDF | cloud-v239.js, index.html | Inspección de consultas, historial y PDF en navegador |
| Las recuperaciones reemplazaban el borrador sin copia durable conjunta | Respaldo previo y nuevo borrador en la misma transacción; exportación de recuperaciones | cloud-v239.js | Runtime y navegador |
| Los errores de almacenamiento se absorbían y podían aparentar éxito | Estado separado Local / Supabase; no se finaliza ni limpia si no se confirmó copia; alerta de pendientes | cloud-v239.js, sync-core-v239.js | Cuota llena, autosincronización apagada y desconexión |
| El respaldo alternativo podía quedar ignorado al volver IndexedDB | Importación atómica de colas/borrador; conserva copias de versiones distintas antes de retirar el respaldo alternativo | cloud-v239.js | Navegador: dos hallazgos recuperados; conflicto conservado como nuevo |
| Catálogos otherCategory/otherStatus no alimentaban el formulario visible de OTROS; quedaba una ruta local antigua oculta | Categoría y estado centrales en Hallazgos de OTROS, categoría en PDF; retirada de ruta oculta sin sincronización | index.html, cloud-v239.js | Navegador de los 4 roles; PDF real OTROS |
| Un PDF generado durante otra edición podía restaurar una instantánea anterior | Instantánea estable y comprobación de sesión/contenido antes de archivar; no sobrescribe la edición posterior | index.html, cloud-v239.js | Inspección, pruebas de flujo PDF e instantánea |
| Reintentos concurrentes y respuestas perdidas podían confundir confirmaciones | Token durable, revisión optimista, una sola promesa de envío, confirmación antes de retirar pendientes | sync-core-v239.js, SQL | 6 pruebas de cola y PostgreSQL local |
| La comparación de JSON dependía del orden de claves | Huella canónica recursiva; excluye historial y datos de vista | sync-core-v239.js | JSON con claves en otro orden |
| Actividad breve con fotografía podía dividirse aunque cabía en una página nueva | Cálculo con capacidad real de página; continuidad explícita para registros mayores de una página | index.html (motor PDF) | 3 PDF reales: APR 10 páginas, OTROS 12, texto extenso 4; límites y registros comprobados y renderizados |
| URLs de fotografías en HTML interpoladas sin escape | Escape de atributos de evidencias e imágenes del historial | index.html | Revisión de rutas de renderizado |

## Protección y estado central

- No se modificaron archivos de v238 ni versiones protegidas, main o la aplicación oficial.
- En Supabase real solo se hicieron consultas de inspección. Permanecen 7 perfiles, 8 permisos y 2 informes v238; no se ejecutaron escrituras de prueba, migraciones ni cambios de usuarios.
- La propuesta SQL crea únicamente objetos v239 y consulta perfiles/permisos/areas originales para validar autorización. No se ha aplicado.
- config-v239.js mantiene HYS239_ENABLE_CENTRAL=false. Los catálogos v238 y su apariencia se pueden leer bajo los permisos existentes para revisar la copia; ninguna edición se escribe en sus tablas. Informes nuevos quedan locales/pendientes de activar Supabase v239.
- La carpeta dist contiene solo recursos de aplicación. QA simulado y pruebas nunca se incluyen en el sitio distribuido.
- El enlace HTTPS de v239 está pendiente de autorización expresa de publicación del entorno de revisión. No se reutilizó ni se reemplazó el sitio v238.

## Pendientes antes de activar almacenamiento central

1. Autorizar el entorno HTTPS de revisión independiente. Desplegarlo y verificar autenticación y acceso visual desde otro navegador.
2. Autorizar dónde crear los objetos Supabase de desarrollo v239; no se asumió permiso para alterar producción. Revisar la propuesta SQL y configurar el entorno elegido.
3. Confirmar si se desea copiar catálogos personalizados desde v238. La propuesta contiene valores iniciales conocidos; no migra informes, fotos ni usuarios reales.
4. Aplicar la propuesta únicamente en el entorno de desarrollo autorizado, ejecutar pruebas con cuentas de prueba y activar HYS239_ENABLE_CENTRAL.
5. Validar la integración HTTPS–Supabase real de v239 (transporte, sesión, retornos de recuperación y límites de tamaño de informes con muchas fotos/PDF). Las pruebas locales no sustituyen esta etapa.
6. La edición sin conexión se prueba dentro de una sesión ya autenticada; una reapertura totalmente sin red puede requerir reconectar para verificar el perfil. No se implementó un nuevo acceso offline ni una PWA.
7. Respaldo alternativo localStorage tiene menor capacidad que IndexedDB; si ambos fallan se bloquean operaciones destructivas y se solicita exportar JSON. El PDF se conserva localmente aunque falle su preparación central, mostrando el error.

No se afirma aprobación funcional ni publicación de v239.
