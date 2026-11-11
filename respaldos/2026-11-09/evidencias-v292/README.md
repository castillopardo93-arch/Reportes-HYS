# Reportes HYS · v292 — Preparación del guardado central verificado

Fecha: 09-11-2026. Rama: `desarrollo/v292-integracion-guardado-controlado`.
Base: `desarrollo/v291-accesos-y-guardado-protegido` @ `624d8cebce5344b52839ac8b847e3dac9da7a7f3`. Código aislado en `v292-review/`.

## Problema confirmado

El cliente de v291 aceptaba respuestas de `hys242_guardar_con_motivo` con solo revisar `revision >= 1`, y podía mostrar “sincronizado” cuando existía una copia local pero no constancia de que el servidor tuviera esa misma revisión. En casos de respuestas equivocadas se podía eliminar una operación pendiente sin confirmación suficiente.

## Solución aplicada

1. Se valida `id`, `modulo`, `revision`, `payload.reportId` y `ultimo_token` del resultado real `informes_v242`, antes de eliminar pendientes.
2. Se permite resultado sin cambio (no-op) con token previo **solo** si el contenido relevante coincide y no existe un PDF adjunto divergente. Esto es necesario porque la función actual de Supabase devuelve la fila anterior cuando no hay cambios.
3. Se deja la operación íntegra y pendiente ante inconsistencias o ausencia de confirmación. No se asegura sincronización por el mero hecho de haber guardado localmente.
4. Los estados de la interfaz requieren metadatos de confirmación alineados con el borrador actual.
5. El callback de red valida la respuesta **antes** de modificar el propietario local.
6. Se incorpora una tercera puerta de activación de escrituras remotas (`HYS292_REMOTE_WRITE_AUTHORIZED=false`) además de las dos banderas heredadas.

## Evidencia del contrato (solo lectura)

En Supabase existen las funciones `hys242_guardar_informe` y `hys242_guardar_con_motivo`. Esta última devuelve una fila `informes_v242`; la primera almacena `ultimo_token` y emplea `revision` para detectar conflictos.

No se consultó ni modificó ningún informe privado real durante esta preparación. No se modificaron RLS, funciones, usuarios, Auth, main ni la aplicación oficial.

## Pruebas y límites

- `evidencias-v292/test-contrato-guardado-v292.cjs`: acuses válidos, identidad, token, casos sin cambios, pérdida de respuesta, confirmación del PDF, cola durable y mensajes de estado.
- CI incluye pruebas v291, v290, v289 y v284.
- Pendiente: validación E2E en navegador real, permisos por perfil y pruebas con dos dispositivos antes de habilitar central.
- Pendiente: confirmar el tratamiento de fotografías, versiones PDF, numeración global y centralización de los catálogos oficiales.

## Acciones que requieren autorización independiente

Desplegar cambios en Supabase, activar banderas remotas, sincronizar datos o publicar la aplicación.
