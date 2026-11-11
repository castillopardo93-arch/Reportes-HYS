# C01 — Línea base protegida de Hallazgos, APR y OTROS
Fecha: 2026-11-05. Rama: `desarrollo/v243`. Carpeta: `v243/`.

## Alcance y criterio
El ítem C01 de la Lista Maestra exige **conservar** la tabla principal de Hallazgos, las proporciones de escritorio, los controles existentes y las fotografías mientras se preparan ampliaciones posteriores. No autoriza publicación ni rediseños.

### Columnas existentes (total 100 %)
| Pos. | Columna | Ancho |
|---|---|---:|
| 1 | N.º | 5 % |
| 2 | Condición detectada | 27 % |
| 3 | Prioridad | 9 % |
| 4 | Medida propuesta | 27 % |
| 5 | Responsable | 13 % |
| 6 | Estado | 9 % |
| 7 | Acciones | 10 % |

Los campos futuros de C03–C09 deben preferentemente incorporarse al detalle plegable o seguimiento, sin quitar estas siete columnas ni reducir innecesariamente las columnas descriptivas.

## Funciones que no se pueden perder
- APR conserva las tres tarjetas; OTROS usa la misma tarjeta de Hallazgos, con ocultación de las dos exclusivas de APR.
- Agregar, editar y eliminar un hallazgo; bloquear cambios cuando la sesión no tiene permiso.
- Fotografías múltiples, miniaturas bajo el registro y no en una columna adicional.
- Desplegar/plegar fotografías, ampliar en visor y cerrar visor.
- Quitar fotografías existentes o pendientes desde el formulario antes de guardar.
- Mantener la presentación móvil, la lectura de detalles y las pruebas de PDF.

## Evidencia técnica
El archivo `index.html` heredado conserva la estructura original, reglas CSS `table:has(> tbody#findings)`, acciones dinámicas de `render()` y el visor `photoViewer`. `mobile-v242.css` conserva reglas responsivas.

**Regresión automatizada añadida:** `node test-c01-v243.cjs`.
Contiene 8 pruebas estáticas deterministas. No ejecuta consultas de Supabase ni pruebas con datos reales. Debe ejecutarse después de cada modificación del módulo Hallazgos; se debe documentar cualquier cambio deliberado del contrato antes de modificar sus expectativas.

## Observaciones sin corrección
- El resumen de miniaturas usa literalmente «Fotografías de esta actividad» también en Hallazgos; es un detalle de nomenclatura, no un cambio de proporciones. Evaluar corrección de texto sin alterar datos ni funcionalidad.
- Aún falta prueba visual en navegadores de escritorio y móviles para confirmar geometría y lectura con textos largos y varias fotografías.
- La configuración central heredada v242 sigue bloqueada (`false/false`). Este punto no activa v243 como aplicación operativa.

## Protección
No modificar `main`, `main/v242`, Supabase, identidades reales, informes, respaldo ni aplicaciones publicadas. C01 se limita a documentar y comprobar el contrato de presentación en `desarrollo/v243`. Cierre sujeto a revisión y aprobación explícita del usuario.
