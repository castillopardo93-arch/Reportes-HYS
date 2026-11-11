# Auditoría integral inicial — Reportes HYS v268
Fecha: 2026-11-08
Base: desarrollo/v267-roles-dinamicos
Rama aislada: desarrollo/v268-auditoria-integral
Estado: diagnóstico estático inicial; NO aprobada ni publicada.

## Método y alcance real
- Se verificó la existencia de 67 archivos de la carpeta v267-review y se copiaron sin alterar v267.
- Inspección estática específica de index.html, gestión-usuarios-v265.js, roles-dinamicos-v267.js, mobile-landscape-v267.js, access-policy-v256.js y manifiesto.
- No se realizaron pruebas en navegador móvil ni de sesión real, ni pruebas E2E de informes, fotos, PDF, RLS, Supabase o notificaciones.
- La ausencia de errores detectados en este muestreo NO significa que otros módulos estén aprobados.

## Hallazgos
### H01 [Alta] CSS móvil acumulativo y contradictorio
index.html incluye estilos de @media(max-width:700px), una corrección posterior @media(max-width:900px) y otra @media (orientation:landscape), mientras mobile-landscape-v267.js añade una cuarta capa de reglas forzadas !important. La barra se define como flex en unas reglas y grid en otras; además hay límites de ancho/alto divergentes. Riesgo: superposición, barra que tapa formularios y regresiones al rotar.
Acción: reemplazar parches por una sola estrategia responsive; definir layout con contenedor único y pruebas de 320/375/390/667/844/932/1024 px, vertical y horizontal.

### H02 [Alta] Roles no son permisos reales
roles-dinamicos-v267.js persiste en localStorage con clave reportes-hys-v267-roles-local. No actualiza permisos_usuario ni políticas RLS ni crea cuentas. Acción: diseñar catálogo persistente en Supabase con migración, permisos por facultad, control de acceso de servidor y auditoría; requerirá autorización explícita para cambios reales.

### H03 [Alta] Condiciones de acceso de laboratorio
El guard isGlobal() requiere HYS266_PREVIEW_ONLY y administrador_global activo, o ausencia de perfil. En ausencia de perfil, el laboratorio permite editar roles locales de prueba. Esto es aceptable solo en QA aislado, pero nunca debe tratarse como autorización real. Acción: mantener aislamiento estricto de QA, validar en backend antes de persistir roles reales.

### H04 [Media] Identidad/versionado
El MANIFIESTO.json heredado declaraba version=267 y branch v267 al copiarse. Se corrigió en v268. La ruta de entrada index.html y diversos identificadores heredados aún usan nombres v242/v265/v266 por compatibilidad; revisar texto visible y rutas antes de publicar.

### H05 [Alta] Falta de pruebas verificables de integración
No se ha demostrado en navegador que Roles, Usuarios, formularios, informes, PDF, fotos, notificaciones, seguimiento y auditoría funcionen en conjunto. No extrapolar verificaciones locales de versiones anteriores a v268.

### H06 [Media] Deuda técnica por archivos históricos
La copia de 67 archivos conserva módulos con sufijos v242–v267. Se requiere inventario de carga, dependencias, duplicación de eventos, errores en consola y scripts no utilizados antes de consolidar.

## Matriz de pruebas pendientes
1. Usuarios: listado, alta simulada, edición, roles, tarjetas, áreas, desactivación, navegación, protección de permisos.
2. Formularios APR/OTROS: creación, edición, cierre, persistencia, recuperación.
3. Hallazgos: seguimiento, asignación, notificación, vencimiento, cierre, historial y trazabilidad.
4. PDF: paginación, fotos, impresión, nomenclatura, ausencia de pérdida de datos.
5. Fotos: subida, vista, eliminación, múltiples fotos, móvil.
6. Integridad y seguridad: XSS, validación de entradas, RLS y control real de roles, solo con acceso de prueba autorizado.
7. Responsive: móviles vertical/horizontal, tablet, escritorio, teclado, zoom y áreas seguras.
8. Almacenamiento: borradores, sincronización, errores de red y recuperación; **no implementar offline/PWA en esta fase**.

## Reglas de protección
- v267, v266, versiones protegidas, main y aplicación oficial: intactas.
- No modificar Supabase ni producción sin autorización.
- Los hallazgos no equivalen a correcciones terminadas.
- Auditoría integral permanece abierta hasta completar revisión de todos los módulos y pruebas.
