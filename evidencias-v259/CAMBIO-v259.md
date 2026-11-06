# Reportes HYS v259 — Accesos y facultades simplificados

Fecha: 6 de noviembre de 2026 (Chile). Base: v258. Copia de desarrollo, sin modificar la aplicación oficial ni versiones anteriores.

## Cambios solicitados

Usuarios se limita a nombre, rol y estado, motivo e historial. Guardar esos datos conserva los accesos y áreas existentes. Se retiraron los bloques repetidos de tarjetas y áreas del formulario de datos.

Facultades pasa a ser el punto único para administrar accesos de usuarios y supervisores, y facultades especiales de administradores, dentro del ámbito permitido al actor. Desde la ficha se abre directamente la cuenta seleccionada. La cuenta propia y el Administrador general no se incluyen como destinos editables.

Nombres visibles vigentes: **Prevencionista de riesgos** y **Supervisores, capataces y otros**. Los selectores, la tabla de usuarios y las etiquetas de gestión utilizan la misma función de nombres de las tarjetas y respetan cambios de apariencia. Los identificadores existentes de servidor no se renombran ni migran. Los nombres propios de cuentas históricas se conservan.

En Facultades: dos casillas de tarjetas permitidas; un selector para configurar la tarjeta; permiso de registrar/editar; áreas plegables con búsqueda, selección de todas las activas y limpieza; facultades especiales solo para destino Administrador y actor Administrador general. La gestión delegada limita las áreas y el permiso de edición al alcance real del actor. Se conservan las validaciones de servidor y la auditoría.

## Guardado y límites

- Abrir o consultar no asigna facultades por defecto. Guardar sin cambios no emite escrituras.
- Los cambios de acceso conservan nombre, rol y estado del destino y usan su revisión vigente. Las facultades tienen su propio control de revisión.
- Las operaciones usan las funciones existentes del servidor. No se instalan ni modifican funciones, tablas, RLS, usuarios o contraseñas por entregar esta versión. Los cambios que José confirme en la interfaz sí se aplicarán a Supabase.
- Un guardado que modifique acceso y facultades puede requerir varias operaciones: no es una transacción única entre todas ellas. Se procesan las revocaciones antes de cambios de acceso y ampliaciones. Si falla una parte se informa cuántas operaciones quedaron confirmadas, se consulta de nuevo y se muestran los valores persistidos. No se promete guardado completo ni se reintentan escrituras automáticamente.
- Para suspender totalmente una cuenta se usa Estado en Usuarios; no se guarda una cuenta activa sin ningún ámbito.
- El guardado central de informes, las invitaciones/correos, el correlativo PDF y el control de informes todavía locales continúan desactivados o pendientes.

## Verificación

482 pruebas automatizadas aprobadas, cero fallidas/omitidas. Cuatro recorridos de navegador (dos flujos × 1440/390 píxeles) con autenticación y servidor simulados: usuarios simplificados, nombres vigentes, acceso básico sin alterar datos, ausencia de escrituras sin cambios, dependencias de facultades, error parcial y reintento solo del pendiente, revocación antes del cambio de acceso, revisión concurrente y cierre por revocación de permisos; además de la regresión de edición, restablecer/deshacer e historial de usuarios. Cero peticiones al backend y cero errores JavaScript en esos recorridos.

Se inspeccionó visualmente el nuevo panel y se comprobó que no desborda horizontalmente en móvil. La construcción incluye 46 recursos locales. Pendiente la comprobación de José con sus cuentas reales y las facultades que decida guardar.
