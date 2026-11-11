# Reportes HYS — Cambio de rol Administrador desde cero (v264)
Fecha: 2026-11-08 (Chile).

## Regla aprobada por el usuario
**Al quitar el rol Administrador, sus facultades especiales se revocan. Si en el futuro se designa nuevamente Administrador, todas las facultades especiales deben comenzar desmarcadas y concederse expresamente desde cero.** Aplica en ambos módulos/tarjetas: Prevencionista de riesgos (código APR) y Supervisores, capataces y otros (código OTROS).

## Comportamiento implementado
1. Al cambiar Administrador → Supervisor o Usuario en el formulario, desaparece el bloque de facultades especiales y se limpian ambas selecciones en memoria; solo se revoca el acceso efectivo al confirmar Guardar.
2. Al cambiar Supervisor/Usuario → Administrador, se muestran inmediatamente los controles, todos desmarcados. No se heredan atribuciones históricas, incluso si habían persistido registros antiguos no válidos en la consulta.
3. Si el Administrador general alterna Administrador → Usuario/Supervisor → Administrador **sin guardar**, también debe seleccionar de nuevo las facultades. Se conserva la selección independiente de tarjetas y áreas, que no son facultades administrativas.
4. El backend simulado revoca facultades antiguas de ambos módulos dentro de una sola actualización de datos al guardar la degradación de rol; la nueva promoción no recupera facultades.
5. Cambiar el rol de Administrador general no se ofrece a usuarios normales; permanece restringido al Administrador general.

## Archivos nuevos y modificados
- Rama independiente: `desarrollo/v264-facultades-desde-cero`, derivada del commit v263 `ad06762849d3aa85ebfd18e2e409a767d8c51e9f`.
- `v264-review/role-control-v262.js`: funciones `blankSpecials` y `roleTransitionSpecials`.
- `v264-review/facultades-v242.js`: lógica de transición en la aplicación completa de desarrollo; no se reactiva una facultad al alternar roles.
- `v264-review/facultades-laboratorio-v263.js`: misma regla en la ficha del laboratorio.
- `v264-review/backend-simulador-v263.js`: clave de almacenamiento local `reportes-hys-v264-simulador-local-1`, aislamiento de datos de v263 y bloqueo de rutas fuera del laboratorio.
- `v264-review/laboratorio-integral-v264.html`: demostración autónoma, con todos los scripts y CSS integrados, evitando la caché cruzada.
- `evidencias-v264/test-facultades-desde-cero.cjs`: 8 pruebas reproducibles con Node.

## Verificaciones ejecutadas
Se ejecutaron **24/24 comprobaciones** de lógica y backend ficticio: revocar autorizaciones de APR y OTROS al retirar Administrador, iniciar sin facultades al promover, alternar roles sin guardar, preservar áreas normales, guardar la retirada y posterior promoción sin privilegios, historial de auditoría con dos eventos, almacenamiento aislado, sintaxis JS y presencia del código en el laboratorio autónomo.

**Alcance de la verificación:** modelo y backend simulado; no es prueba end-to-end de producción. La implementación del RPC transaccional real de Supabase y las pruebas RLS siguen pendientes. En esta revisión no se modificó ni desplegó Supabase.

## Estado
Desarrollo **no aprobado para producción**. `main`, v263, v262, v261, v260 y versiones protegidas intactas. Modo sin conexión fuera de alcance.
