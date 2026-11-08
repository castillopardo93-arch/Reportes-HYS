# Reportes HYS v269 — correcciones aplicadas y auditoría de regresión pendiente
Fecha: 2026-11-08
Base protegida: desarrollo/v268-auditoria-integral
Nueva rama aislada: desarrollo/v269-correcciones-auditoria

## Correcciones efectivamente aplicadas
- Se creó copia aislada de los 67 archivos de v268 en v269-review; v268, v267, main y aplicación oficial no fueron modificadas.
- index.html: se retiraron tres bloques de reglas de cinta móvil superpuestos (max-width:700, max-width:900 y landscape); se sustituyeron por una sola estrategia responsive en max-width:1024, con ajustes acotados para orientación.
- index.html: la barra inferior utiliza grid con dos columnas (menú y opciones), opciones en una fila desplazable horizontalmente; se reserva espacio inferior para no cubrir formularios.
- index.html: se retiró la carga de mobile-landscape-v267.js para evitar una cuarta capa dinámica de estilos y cambios de clase al girar.
- index.html: se ajustó el indicador visible a v269 y la activación del laboratorio QA a la ruta v269.
- gestion-usuarios-v265.js: la ruta v269 está reconocida como laboratorio; se conserva tarjeta «Gestión de roles» dentro de «Usuarios registrados».
- MANIFIESTO.json: actualizado a v269, base v268 y estado de correcciones parciales.

## Auditoría estática adicional
Se inspeccionaron: cloud-v242.js, storage-v242.js, notifications-f251.js, role-control-v262.js, backend-simulador-v263.js, risk-catalog-v243.js, access-settings-v259.js, integrity-v255.js, sync-core-v242.js.
No se detectaron usos textuales de eval() o new Function() en estos archivos. Este dato no certifica ausencia de vulnerabilidades.
Se mantienen dependencias de almacenamiento local, simuladores y reglas de acceso heredadas; necesitan pruebas de integración, permisos reales y fallos de red.

## Hallazgos aún NO resueltos
- H02: los roles de v267 son un catálogo local; no conceden permisos reales ni actualizan Supabase/RLS. Implementarlo exige diseño de esquema, autorización explícita y pruebas de seguridad.
- H03: QA admite catálogo local sin perfil real únicamente bajo bandera de laboratorio; impedir exposición fuera de QA.
- H05: faltan pruebas visuales reales de móvil vertical/horizontal y pruebas de integración de PDF, fotografías, notificaciones, cierres, seguimiento y persistencia.
- H06: múltiples archivos históricos y reglas heredadas requieren inventario de dependencias y cobertura de regresión.
- El archivo mobile-landscape-v267.js permanece como respaldo histórico dentro de la copia, pero ya no se carga en index.html.

## Criterios de aprobación pendientes
1. En iPhone horizontal y vertical: barra inferior sin superposición, todas las opciones navegables, rotación reversible.
2. En escritorio/tablet: navegación lateral e interfaz de gestión sin regresiones.
3. Usuarios y roles: abrir, editar borradores, duplicar, desactivar, sin escritura real.
4. Informe APR/OTROS, hallazgos, seguimiento, PDF, fotos, impresión, historial y notificaciones: pruebas E2E.
5. Seguridad: verificación de autorización de backend y RLS en ambiente autorizado de pruebas.
6. No activar modo offline/PWA ni modificar producción/Supabase.

## Estado
CORRECCIONES PARCIALES APLICADAS — NO APROBADA.
No afirmar que la aplicación está libre de errores o que se verificó en navegador.
