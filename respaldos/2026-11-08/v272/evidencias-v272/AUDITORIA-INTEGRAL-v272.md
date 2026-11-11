# Reportes HYS — Auditoría integral estática v272
Fecha: 2026-11-08
Base: desarrollo/v271-sin-creacion-roles
Copia aislada: desarrollo/v272-auditoria-integral (67 archivos)
Estado: ABIERTA / NO APROBADA.

## Método
Inventario completo de archivos de la copia y lectura estática de index.html, MANIFIESTO.json y módulos de usuarios, facultades, almacenamiento, sincronización, PDF, notificaciones, hallazgos, actividades, riesgos, permisos, simuladores y auditoría. No se ejecutaron pruebas E2E, navegador real, validación de Supabase/RLS, escritura ni despliegues. Un análisis estático no certifica funcionamiento real.

## Hallazgos confirmados

### A01 — ALTA — v272 no activa QA con ?qa=1
- index.html líneas 297–299 solo admiten rutas v267, v269, v270 y v271. La nueva ruta v272 queda fuera.
- gestion-usuarios-v265.js línea 14 tampoco incluye v272.
- Efecto: las pruebas que dependen de HYS266_PREVIEW_ONLY y HYS265_LAB_MODE no se habilitan en la copia de auditoría.
- Recomendación: unificar detección de entorno en módulo de configuración, con lista explícita de ramas de desarrollo y sin depender de coincidencias dispersas.

### A02 — ALTA — Simulador de usuarios desalineado con versiones posteriores a v266
- backend-simulador-v263.js línea 7 solo permite laboratorio-integral-v265.html o ruta /v266-review/index.html, aunque el index actual marca HYS263_SANDBOX para v271.
- gestion-usuarios-v265.js exige Hys263Lab para su modo local (líneas 14–15).
- Efecto: el formulario puede mostrarse sin backend ficticio de guardado. No se debe interpretar la presencia de usuarios en pantalla como prueba de altas funcionales.
- Recomendación: corregir la lista blanca de rutas en el simulador con guardias estrictas de host y bandera QA, y ejecutar pruebas de altas/ediciones ficticias.

### A03 — ALTA — Gestión de usuarios no guarda cuentas reales
- gestion-usuarios-v265.js líneas 485–499 bloquea expresamente save() cuando !lab; la lectura sí puede consultar Supabase mediante RPC hys242_listar_usuarios (líneas 118–127).
- Efecto: lectura y edición visual pueden coexistir sin persistencia real. Es un bloqueo deliberado, no un error accidental; mantenerlo hasta migración y autorización.
- Recomendación: no habilitar escritura real sin esquema, permisos de servidor, RLS y auditoría transaccional.

### A04 — MEDIA — Verificador heredado no reconoce la ruta nueva
- verificacion-punto3-v266.js línea 7 restringe QA a /v266-review/index.html. En v272 el verificador no ejecuta su ruta de prueba.
- Recomendación: mover las pruebas a un runner versionado y desacoplado del nombre de carpeta.

### A05 — MEDIA — Gestión de usuarios duplicada a nivel de código
- index.html líneas 1381–1404 mantiene formulario y botones de administración históricos; operaciones-v242.js también contiene administración de usuarios; gestion-usuarios-v265.js centraliza la interfaz actual.
- La duplicidad de implementaciones incrementa riesgo de divergencia; no se demuestra que todas estén simultáneamente visibles o activas.
- Recomendación: inventario de puntos de entrada, eliminación progresiva de flujos inactivos y tests de una sola tarjeta por responsabilidad.

### A06 — MEDIA — Dependencias externas para PDF
- index.html líneas 290–292 carga html2pdf, html2canvas y jsPDF desde CDN. Sin disponibilidad de esos recursos la generación/preview puede fallar.
- Recomendación: pruebas de red y de manejo de error; no implementar PWA/offline en esta auditoría.

### A07 — MEDIA — Estado y almacenamiento con herencia histórica
- storage-v242.js conserva prefijos hys-v266-laboratorio; el sistema usa almacenamiento local/IndexedDB aislado. Requiere pruebas de cambio de usuario, módulo, sesiones y respaldo.
- Recomendación: ensayar aislamiento de borradores y recuperación; no migrar ni eliminar datos previos automáticamente.

### A08 — MEDIA — Validación de permisos y RLS no demostrada
- index.html líneas 993–1068 inicializa cliente Supabase y puede leer perfiles, mientras operaciones-v242.js y facultades-v242.js definen llamadas RPC condicionadas.
- No se verificaron políticas RLS ni seguridad efectiva de cada operación. El ocultamiento visual no sustituye control en servidor.
- Recomendación: revisión read-only del esquema y pruebas autorizadas de roles y acceso cruzado antes de habilitar escritura.

## Verificaciones favorables limitadas
- index.html ya no carga roles-dinamicos-v267.js: no aparece la tarjeta de creación dinámica de roles.
- gestion-usuarios-v265.js muestra solo las pestañas Crear usuario, Usuarios registrados e Historial (línea 49).
- En 30 archivos JS inspeccionados no se detectaron llamadas literales eval() ni new Function(). No implica ausencia de vulnerabilidades.
- Manifiesto v272 actualizado, v271 y versiones anteriores conservadas.

## Matriz de pruebas pendiente
- Móvil vertical/horizontal (iPhone y Android), tablet y escritorio; barra, scroll, tarjetas, rotación, modales.
- Usuarios: lectura, alta ficticia, edición ficticia, roles fijos, facultades, permisos, historial.
- APR/OTROS: formularios, campos, guardado, borradores, cambio de usuario y recuperación.
- Hallazgos: asignación, seguimiento, acciones, fechas, cierre, notificaciones, auditoría.
- PDF: paginación, fotos, impresión, compartir, archivo, modificación e historial.
- Seguridad: sesiones, autorización de servidor, RLS, aislamiento por proyecto/área/módulo.
- Errores de red, fallas de almacenamiento, regresiones y accesibilidad.

## Protección y decisión
- No modificar main, versiones protegidas, aplicación oficial ni Supabase.
- No activar modo offline/PWA en esta fase.
- La auditoría estática detectó defectos concretos, pero NO equivale a una auditoría funcional integral aprobada.
- Prioridad de corrección: A01+A02+A04, después A05, luego pruebas de regresión y seguridad.
