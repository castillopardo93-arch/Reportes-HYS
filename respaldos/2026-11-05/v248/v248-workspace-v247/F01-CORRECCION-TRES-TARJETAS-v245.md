# Corrección F01 — Pendientes en las tres tarjetas

**Fecha:** 2026-11-05 · **Versión:** desarrollo v245 · **Incidencia reportada:** «Me apareció solo los pendientes de Actividad por área; el de la tarjeta 1 no y 3 tampoco».

## Causa encontrada
La bandeja F01 anterior incluía únicamente:
- Actividades HYS y por área **si** `record[5].activityType === 'assigned'`.
- Hallazgos **solo si** `record[6].actions` contenía acciones individuales.

Por ello, un hallazgo con estado «Pendiente» y medida propuesta, pero sin acciones individuales, no se mostraba. Asimismo una actividad «Requiere seguimiento» sin clasificación «Tarea asignada» no figuraba.

## Solución de presentación local

- **Tarjeta 1:** se incluyen tareas formalmente clasificadas como asignadas; además, se muestran a nivel de equipo actividades con resultado «Con observaciones» o «Requiere seguimiento» como **«Actividad HYS por clasificar»**, sin atribuirlas a un usuario ni emitir alertas.
- **Tarjeta 2:** igual criterio para tareas asignadas y para estados «Pendiente», «En proceso» o «Por revisar» que aún no tengan clasificación, denominándolas **«Actividad por área por clasificar»**.
- **Tarjeta 3:** un hallazgo «Pendiente», «En proceso», «Por revisar» o «Abierto» **sin acciones individuales** se incluye como **«Hallazgo pendiente de seguimiento»**. Si tiene un solo responsable con UUID válido en el módulo y un identificador estable, se vincula a su filtro. Si tiene múltiples o ningún responsable, aparece solo en la vista del equipo, pendiente de asignar tareas específicas.
- Se agrega un **resumen de pendientes por cada una de las tres tarjetas**, indicando cuándo las actividades informativas se excluyen.
- Registros antiguos sin UUID se muestran en la vista de equipo **solo como advertencias de clasificación**, no como obligaciones personales; no se les asigna identidad por texto ni por índice.
- Acciones verificadas con evidencia suficiente se excluyen; hallazgos completados sin tareas pendientes no generan avisos.
- Se conservan los filtros por UUID, el aislamiento APR/OTROS y la lista local sin envíos de notificaciones ni cambios de estado.

## Alcance y pruebas
El módulo continúa siendo **solo lectura** y no modifica reportes, fotos, usuarios, permisos ni Supabase. Las pruebas del archivo `test-f01-v245.cjs` amplían los casos 19–27. Se requiere nueva comprobación visual en APR (las tres tarjetas) y OTROS antes de aprobar F01.

**Proyecto:** el selector único «Proyecto Hidroeléctrico Alto Maipo» se conserva de la modificación previa. No se modifica `main` ni ramas anteriores.
