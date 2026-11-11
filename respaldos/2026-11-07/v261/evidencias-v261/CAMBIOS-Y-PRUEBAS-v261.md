# Reportes HYS v261 — Facultades unificadas

**Fecha:** 2026-11-07 (Chile)  
**Base inmutable:** `desarrollo/v260-auditoria-integral` (`ae07303b5f86fe3b3e43cb19f503c8c480fa5d61`).  
**Nueva rama:** `desarrollo/v261-facultades-unificadas`.  
**Estado:** desarrollo en revisión, NO aprobado para producción.

## Objetivo

El Administrador general selecciona una persona y gestiona **ambas tarjetas** desde una ficha única:

1. Vista general de usuarios administrables con búsqueda y filtro por tarjeta.
2. Tarjetas independientes: **Prevencionista de riesgos** (código APR) y **Supervisores, capataces y otros** (código OTROS).
3. Cada tarjeta ofrece **Todas las áreas activas autorizadas** o **Seleccionar áreas**. La segunda opción despliega búsqueda y casillas por área. La elección «Todas» se traduce a IDs de áreas actualmente activas, sin otorgar automáticamente áreas futuras.
4. Copiar áreas coincidentes **por nombre** entre tarjetas, traduciendo sus IDs por módulo y omitiendo áreas no autorizadas.
5. Facultad «Registrar y editar sus informes» por tarjeta.
6. Si la cuenta tiene rol **Administrador**, aparece la sección de facultades especiales (informes, personas, áreas y auditoría), por tarjeta, solo para Administrador general.
7. Resumen de accesos, áreas y atribuciones, motivo y un único botón de guardado.

**No se repiten** roles, datos de identidad, áreas ni opciones especiales en otros formularios de Facultades. La pestaña Usuarios conserva exclusivamente datos de cuenta, rol y estado.

## Cambios técnicos

- `v261-review/facultades-v242.js`: nueva ficha central, lista y filtros, validación, permisos por módulo y confirmaciones.
- `v261-review/faculty-model-v261.js`: modelo puro y comprobable de áreas, equivalencias, resúmenes y validación.
- `v261-review/faculty-settings-v259.css`: disposición adaptable a PC y móvil.
- `v261-review/index.html`: carga del modelo antes del controlador de Facultades.
- `v261-review/storage-v242.js`, `cloud-v242.js`: nuevos prefijos `hys-v261-facultades` aislados de v260 y Work.
- `v261-review/demo-facultades.html`: demostración aislada, **datos totalmente ficticios**, sin autenticación ni escritura a Supabase.
- `v261-review/config-v242.js`: el guardado administrativo sigue expresamente deshabilitado.

## Política de seguridad del guardado

Una asignación de ambas tarjetas puede ser una única operación del RPC de cuenta. Sin embargo, una combinación de cambio de tarjeta y facultades especiales **requiere transacción única**. La v261:
- Nunca ejecuta en secuencia varias escrituras administrativas de facultades.
- Bloquea cualquier guardado múltiple si no existe la bandera `HYS261_ATOMIC_FACULTIES_READY=true` y un procedimiento transaccional `hys261_guardar_facultades_atomico` implementado y probado **en entorno aislado**.
- Mantiene `HYS257_ENABLE_USER_MANAGEMENT=false` y `HYS261_ATOMIC_FACULTIES_READY=false`, por lo que **no escribe en Supabase** desde esta copia.
- Exige motivo, validación de áreas y prohibición de cambios fuera de módulos delegados.
- La autorización definitiva debe seguir verificándose en las funciones/RLS de servidor.

El procedimiento de Supabase mencionado es un **contrato futuro**, NO fue desplegado, NO existe prueba funcional de guardado transaccional.

## Verificaciones ejecutadas

- Sintaxis válida de archivos de controlador, modelo, configuración, almacenamiento y nube.
- **16/16** verificaciones estáticas adicionales de compatibilidad y protección, incluidos **9 scripts inline** sin error y **150 identificadores HTML** sin duplicados.
- **12/12** comprobaciones de modelo aislado: nombres normalizados, áreas activas autorizadas, coincidencia «Todas», copia intertarjetas, acceso a ambas tarjetas, validación de permisos, resumen y protección de guardados.
- Se agregó `evidencias-v261/test-facultades-v261.cjs` con pruebas reproducibles mediante Node, para ejecutar junto a la aplicación al obtener una copia local.
- Navegador sobre `demo-facultades.html`: directorio con 4 usuarios ficticios, abrir Administrador, ambas tarjetas, activar la segunda, visualizar/seleccionar áreas, facultades especiales por tarjeta y resumen; **sin errores visibles**. Regresar/cerrar con cambios sin guardar muestra confirmación; la prueba automatizada no la aceptó, así que **no se computa esa navegación como aprobada**.
- No se probaron sesiones reales, operaciones reales sobre Supabase, ni guardado transaccional remoto. Las pruebas **no** certifican producción.

## Pendientes

1. Revisar visualmente con el usuario en la demostración, incluyendo PC y teléfono.
2. Probar navegación al aceptar y rechazar «Descartar cambios» y flujos completos con roles y servidor simulados.
3. Implementar y probar el RPC administrativo transaccional en entorno de prueba y luego solicitar autorización separada para activarlo.
4. Revalidar los flujos reales de usuarios, permisos y reportes antes de publicar.
5. El modo sin conexión permanece expresamente **fuera de alcance**.

## Conservación de versiones

No se actualizaron `main`, `desarrollo/v260-auditoria-integral`, v259 ni ramas protegidas. No se publicó la aplicación ni se alteró Supabase de producción.
