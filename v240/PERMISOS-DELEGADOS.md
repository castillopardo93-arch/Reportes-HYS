# Facultades delegadas y nombres de roles — revisión local

Única modificación autorizada: ampliar la demostración independiente v240 para revisión. No se modificó Supabase, Auth, RLS, Edge Functions, main, v239 ni la web publicada.

## Nombres visibles
Administrador general (único), Administrador, Supervisor y Usuario. Se conservan las claves internas administrador_global, administrador_area, supervisor y usuario; no hay migración de roles reales. La muestra anterior de un segundo global inactivo se sustituyó por un usuario inactivo ficticio. El modelo de delegación prohíbe crear/promover otro general y protege la identidad de la cuenta existente.

## Funcionamiento
Desde Seguimiento → Facultades delegadas, únicamente el Administrador general elige un administrador y asigna áreas explícitas por módulo y acciones: consulta, PDF ficticio, revisión/devolución, aprobación, cierre, edición excepcional de medidas, áreas, gestión de usuarios/supervisores, desactivación/reactivación y auditoría. Se exige motivo y se muestra el resumen de permisos efectivos. Nuevas facultades desactivadas; se conserva la gestión de áreas del administrador de muestra.

El selector Ver como sirve exclusivamente para probar perfiles ficticios; no es un inicio de sesión ni una autorización real. El administrador recibe las secciones habilitadas; no puede editar facultades, crear administradores, tocar otros administradores, modificar al general o a sí mismo. Los usuarios que crea quedan limitados a su ámbito. Las cuentas con áreas ajenas o sin ámbito conocido no pueden gestionarse por delegación. Activación y cambios de datos se realizan por separado. La consulta filtra también las opciones de filtros, no solo los resultados.

Editar una medida ajena exige permiso, versión vigente y motivo; un informe cerrado requiere reapertura del general. Editar un aprobado lo devuelve a Enviado para no conservar una aprobación sobre texto cambiado. No cambia el creador. Aprobar y cerrar son permisos distintos; autoaprobación y reapertura delegada se rechazan. No se incorporan informes históricos al flujo automáticamente.

El PDF nuevo es una evidencia mínima de DEMOSTRACIÓN, con datos ficticios. No usa ni modifica el motor de informes reales de v239. Estas facultades necesitan validación y almacenamiento en servidor antes de producción: no se afirma seguridad real basada solo en JavaScript.

## Criterios y evidencia
- 13 grupos existentes aprobados, incluida igualdad de los nueve recursos heredados de v239.
- 10 grupos nuevos aprobados: unicidad del general; rechazo de promoción; exclusividad/motivo; áreas y acciones válidas; consulta limitada; altas limitadas; activación independiente; revisión granular; edición con motivo/versión; revocación y desactivación con actor antiguo.
- Prueba visual: general habilita consultar y aprobar en áreas APR; al seleccionar Administrador solo aparecen esas opciones y los dos informes APR de sus áreas. OTROS y la pestaña Facultades delegadas no están disponibles para ese perfil. Regreso al general y resumen efectivo comprobados.
- Integridad v239 aprobada y 86 huellas de v238 sin cambios. No se probaron cuentas reales ni se aplicó un permiso real.
- Evidencia visual local: diagnostico-global/facultades-administrador-general.png. La captura muestra solo simulación.

## Archivos y reversión
global-demo/permissions.js, global-demo/delegation-ui.js, global-demo/app.js, global-demo/index.html, global-panel.js, server.cjs y pruebas. Los estilos originales se conservan. Las facultades y eventos del panel son de memoria: recargar reinicia la demostración; no borra informes reales. Para revertir código usar el commit anterior de desarrollo/v240 sin tocar datos o versiones protegidas. Se conserva el ZIP de la demostración anterior.

Etapa 2 continúa siendo solo prototipo local. Se requiere autorización explícita para conectar facultades a datos reales, cambiar seguridad o publicar.
