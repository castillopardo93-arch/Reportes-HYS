# Reportes HYS v298 — Conexión central de solo lectura

Fecha: 09-11-2026. Rama: `desarrollo/v298-lectura-central-autenticada`. Base: `desarrollo/v297-auditoria-sincronizacion-trazabilidad`, commit `4aebd798867cb0ea16ae75dfe0906b025a7c920d`.

## Qué se conectó en código
La autenticación existente ya utiliza Supabase Auth y la RPC `hys242_contexto`. v298 agrega una segunda puerta independiente, `HYS298_ENABLE_REMOTE_READS=true`, para consultar los informes autorizados sin habilitar escrituras.

1. `Hys298ReadGate.permitted` exige sesión local identificada, perfil activo, selección de tarjeta dentro de los permisos confirmados, cliente Supabase y conexión.
2. `Hys298ReadGate.preflight` llama exclusivamente a `auth.getUser`, `hys242_contexto` y `hys242_consultar_informes`, verificando identidad y ámbito de la respuesta después de cada llamada.
3. Las consultas del historial y PDF se habilitan mediante `canReadCentral()`, independientes de las banderas de escritura. `fetchReport` conserva las protecciones de identidad, revisión y PDF implementadas en v294-v297.
4. Botón `Comprobar lectura Supabase` disponible al acceder a la tarjeta para verificar conexión y mostrar únicamente un recuento de informes de la primera página autorizada. No se muestran registros sin permisos.
5. Guardado, edición, archivado y las operaciones RPC de modificación continúan bajo las tres banderas centrales desactivadas.

## Validación en servidor (solo lectura)
Las RPC `hys242_contexto`, `hys242_consultar_informes` y `hys242_cargar_informe` están presentes. El backend comprueba el ámbito de usuarios en la consulta y la descarga; no se ha ejecutado ningún RPC de escritura.

## Seguridad
`HYS242_ENABLE_CENTRAL=false`, `HYS242_DEPLOYMENT_READY=false`, `HYS292_REMOTE_WRITE_AUTHORIZED=false`. No hay modificación de roles, perfiles, registros ni migraciones en Supabase. Esta es una rama de desarrollo, no un despliegue ni una URL pública.

## Pruebas
- `evidencias-v298/test-lectura-central-v298.cjs`
- `.github/workflows/qa-v298-lectura-central.yml`
- Regresiones v297, v296, v295, v294, v293, v292, v291, v290, v289 y v284.

## Pendiente
- Ejecutar `v298-review/index.html` desde un servidor local y acceder con un usuario autorizado.
- Comprobar la interfaz de ambas tarjetas y recuperar informes reales con autorización.
- Validar y, con permiso específico, instalar las migraciones de gestión laboral v279-v282.
- Corregir en el servidor el no-op que excluye `history`, con migración auditada, antes de habilitar la sincronización de informes.
- No publicar ni modificar production sin aprobación.
