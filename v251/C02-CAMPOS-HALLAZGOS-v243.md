# C02 — Contrato de campos originales de Hallazgos (APR y OTROS)
Fecha: 2026-11-05. Rama exclusiva: `desarrollo/v243`.
Estado: documentado y protegido estructuralmente; falta validación visual y aprobación del usuario.

## Objetivo aprobado de C02
Mantener intactos el significado, la secuencia y la compatibilidad de los cinco campos históricos de cada hallazgo, así como las acciones sobre el registro. Las funciones futuras C03–C10 no deben romper su almacenamiento ni exportación.

## Modelo actual
| Índice de registro | Nombre | Interfaz |
|---:|---|---|
| 0 | Condición detectada | textarea, obligatorio |
| 1 | Prioridad | selector: Baja / Media / Alta / Crítica |
| 2 | Medida propuesta | textarea |
| 3 | Responsable | textarea; **todavía es texto libre** |
| 4 | Estado | selector: Pendiente / En proceso / Completado |
| 5 | Evidencias adjuntas | arreglo de objetos adjuntos/fotografías, fuera de la tabla principal |
| 6 | Tipo de actividad (solo OTROS) | metadato `{category: string}`, opcional |

Las columnas visibles principales siguen siendo siete: `N.º`, los cinco campos anteriores y `Acciones`. Acciones no se guarda como campo de datos: contiene los botones Editar / Eliminar.

## Compatible entre APR, OTROS y PDF
- Tanto `keys.findings` como `labels.findings` deben conservar exactamente el orden 0–4; `render()` y el modal se basan en esos índices.
- `recordForm` obtiene valores por `f0`–`f4`, luego adjunta evidencias en posición 5 y la categoría OTROS en posición 6.
- `pack()` conserva el arreglo `data.findings` tanto en APR como en OTROS.
- El motor PDF define `findingSection` con los mismos cinco nombres y añade `Tipo de actividad` solamente en OTROS, cuando existe.
- Las viñetas se preservan para Condición detectada, Medida propuesta y Responsable (varias líneas).
- El control de permisos bloquea altas y ediciones sin `canWrite()`.

## Hallazgos y límites de C02
1. **Responsable es texto libre**: no reemplazar todavía con identidad de Supabase. Eso se diseñará en C04, considerando migración de valores históricos.
2. **Los estados originales son tres**: no cambiar ni fusionar con estados futuros de seguimiento sin compatibilidad y autorización.
3. El detalle de evidencias se sigue llamando «Fotografías de esta actividad» también en Hallazgos; se documentó en C01. No se alteró.
4. Se mantienen intactas la lógica de UI, PDF y serialización: C02 **no modifica los formularios de producción** ni crea un nuevo esquema remoto v243.

## Pruebas
`node test-c02-v243.cjs` — 10 casos estructurales deterministas. No simulan pruebas de rol real ni cobertura de navegador o sincronización. También conservar `node test-c01-v243.cjs`.

## Condiciones para puntos siguientes
- C03: selector múltiple de riesgos **sin sustituir ni desplazar** los cinco valores históricos.
- C04: seleccionar usuarios y almacenar identificadores estables preservando nombre legado y visibilidad.
- C05 y posteriores: fechas, seguimiento, acciones individuales, notificaciones y auditoría fuera del arreglo heredado o con migración versionada aprobada.
- No modificar `main`, `main/v242`, aplicación oficial ni Supabase. `config-v242.js` en v243 conserva banderas centrales `false`.

Próximo paso tras aprobación expresa de C02: **C03: selector de riesgos por nombre/código, búsqueda sin tildes, multiselección y catálogo offline**, primero con diseño de almacenamiento compatible.
