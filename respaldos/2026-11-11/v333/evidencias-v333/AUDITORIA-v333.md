# Auditoría de Reportes HYS v333

Rama local `desarrollo/v333-auditoria-funcional`, aislada de v332 (`80793d0`). Alcance: recorridos funcionales y controles de interfaz automatizados contra el servidor y PostgreSQL locales, análisis de código e inventario reproducible. Se utilizaron datos ficticios.

| Hallazgo | Causa | Corrección | Verificación |
|---|---|---|---|
| INV-333-01: «Crear asociado» aparecía cuando el documento ya existía en otra página. | La interfaz buscaba la otra mitad del expediente solo entre los 20 resultados cargados. | El servidor verifica toda la relación y entrega la facultad efectiva para crear el asociado. El listado muestra el correlativo en vez del UUID. | Se ubicó Flash y Final del mismo expediente en lados opuestos del límite de paginación. El resultado no ofreció crear un duplicado. |
| INV-333-02: los botones de revisión y cierre podían ofrecer operaciones que serían denegadas. | La interfaz miraba el estado y la identidad genérica, sin comprobar el revisor asignado, la facultad de cierre o la compatibilidad de Flash. | La respuesta autorizada de lectura devuelve las acciones permitidas. El editor refleja esos permisos y señala si Final necesita reconciliar Flash. | El revisor sin facultad de cierre ve el botón deshabilitado y una solicitud directa devuelve 403. El Final obsoleto bloquea la aprobación en pantalla y en el servidor. Revisión y cierre autorizados siguen funcionando. |
| UI-333-03: Tab podía abandonar el diálogo de Investigación. | El diálogo manejaba Escape y devolvía el foco al cerrar, pero carecía de un ciclo de foco. | Tab y Mayús+Tab recorren los controles visibles habilitados dentro del diálogo. | Prueba de los dos extremos del foco y devolución al botón de apertura con Escape. JSDOM simula la geometría de los controles, así que esta prueba no acredita el diseño visual. |

## Cobertura de regresión

- Prevencionistas y Supervisores/Capataces u otros: acceso por tarjeta, recuperación, guardado, validación de fechas y carga, PDF con fotos, finalización, concurrencia, historial paginado y descarga tras reiniciar.
- Investigación: Flash y Final, catálogo de 153 causas, máximo de 40 planes, borrador Final independiente, evidencias, revisión, devoluciones, cierres, corrección de Flash, permisos y descarga de ambos PDF con el mismo correlativo.
- Accesos: identidades ficticias, revocación con sesión activa, aislamiento por área y tarjeta y denegaciones directas. El ejecutor de Supabase se probó con un servidor simulado.
- Código e interfaz: inventario de recursos, sintaxis y suites de protección del formato existente. Los chequeos históricos se distinguen en los resultados.

## Pendientes y reversión

La revisión de interfaz fue automatizada. Quedan pendientes el diseño visual y la impresión en navegador gráfico, la aceptación móvil en equipos reales y la validación de usuarios, facultades y demás integraciones con Supabase Auth. Las suites no acreditan un circuito real de producción para administración, notificaciones ni Power BI.

La migración 012 es local. Si se requiere volver a v332, conserva la carpeta de datos de v333 como respaldo y arranca v332 con su propia carpeta. La rama principal, la aplicación publicada y Supabase oficial permanecen intactos.

Pasaron 25 de 25 pruebas del laboratorio, 24 de 24 suites de regresión (tres históricas) y 60 de 60 comprobaciones de sintaxis.
