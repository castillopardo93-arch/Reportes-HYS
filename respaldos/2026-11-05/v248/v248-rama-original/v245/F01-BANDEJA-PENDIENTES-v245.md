# F01 — Campana de pendientes y bandeja de planificación local (v245)

**Rama:** `desarrollo/v245` · **Fecha:** 2026-11-05 · **Base protegida:** `desarrollo/v244`.

## Cierre de la letra E comunicado por el usuario
El usuario aprobó **E01–E02** (fichas, cargo, teléfono, correo, preferencias, validación y guardado ficticio), **E03** solo a nivel de diseño (roles, organización/proyecto/módulo/área, sin permisos de servidor), **E04** (áreas operativas ficticias, edición, desactivación, reactivación y duplicados) y **E05** solo visual (historial central sin conexión y sin eventos falsos). La letra E está **cerrada únicamente para la revisión visual local**. E01/E02 no persisten remotamente; E03 no certifica autorización; E04 no modifica áreas reales; E05 no certifica auditoría append-only. Ninguna publicación autorizada.

La letra D quedó aprobada por el usuario, incluido D07 PDF de APR con campos nuevos, fotografías, viñetas y paginación de la revisión v244.

## Objetivo F01
Mostrar en **APR y OTROS** una campana de **pendientes de planificación**, alimentada únicamente por datos de los formularios actuales. No se almacena ni inventa un envío de notificaciones, recibo, lectura, cierre ni verificación.

### Fuente de datos
- Acciones individuales C08 dentro de Hallazgos: `finding[6].actions[]`, con UUID de hallazgo y acción, identificador de responsable enlazado al módulo, estado y fecha compromiso del hallazgo.
- Para APR únicamente: actividades HYS y por área D05 clasificadas `activityType:'assigned'` y su fecha compromiso `record[5].dueDate`. Las actividades informativas quedan fuera.
- Solo se construye el listado cuando `report.module` coincide exactamente con el módulo actual; **OTROS no puede leer actividades APR**.
- Si una identidad/UUID/fecha o acción es inconsistente, se omite o se presenta como necesidad de revisión; no se declara cerrada ni verificada por deducción.
- El listado ordena vencidos, fecha actual, futuros y sin fecha. Los filtros de cuenta usan **UUID**, nunca coincidencia parcial de nombres.

### Comportamiento de interfaz
- Campana junto al encabezado superior, contador de **tareas planificadas visibles** (no contador de avisos enviados).
- Bandeja con título/descripción, persona vinculada, compromiso, estado de plazo y botón que navega a la sección pertinente del Informe Diario.
- Una nueva lectura local actualiza el contador tras cambiar datos del informe; no modifica registros ni guarda estados adicionales.
- En la **demostración aislada** se habilita una **vista por equipo ficticio** y filtros por personas ficticias A/B (APR) o C/D (OTROS). **El filtro no representa suplantación de identidad ni concede permisos.**
- En la copia de desarrollo normal solo se listan los pendientes asignados al usuario actual; no existe una vista de equipo hasta contar con autorización del servidor.

### Lo que F01 no hace
No envía correo, WhatsApp, alertas push o avisos internos; no cambia estado leído/no leído; no ejecuta, verifica, devuelve, reasigna o cierra tareas; no conecta Supabase; no crea una bandeja remota ni un historial central. F02–F07 quedan pendientes para desarrollos posteriores.

## Reglas de seguridad y continuidad
`main`, la aplicación oficial, Supabase real y la v244 aprobada visualmente permanecen intactos. `v245-review` es una vista independiente con catálogos ficticios y una lista blanca de recursos, sin SDK real ni credenciales. F01 debe probarse visualmente en APR y OTROS antes de considerarse aprobada. Las pruebas de Node y las verificaciones de navegador pueden respaldar el diseño pero no sustituyen el backend aislado ni la matriz de permisos reales.

## Puntos siguientes
F02: estados y contratos de avisos internos (sin envío real). F03: recordatorios y vencimientos. F04: acuses de lectura con confirmación del servidor. F05: avisos de reasignación y ausencias. F06: correo por proveedor aislado y preferencias de contacto. F07: auditoría, métricas de avisos y pruebas de seguridad/E2E. Los nombres de estos subpuntos son una propuesta de continuidad, ajustable según la Lista Maestra acordada; no se consideran implementados en F01.
