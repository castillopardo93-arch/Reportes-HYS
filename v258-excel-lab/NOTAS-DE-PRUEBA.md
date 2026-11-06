# Laboratorio de integración Excel — base Work v258

Rama: `desarrollo/excel-v258-integracion-pruebas`
Base: rama `desarrollo/v258`, carpeta `v258-review/`. Ningún archivo de `v258-review/`, v257, main ni versiones oficiales fue modificado.
Esta carpeta `v258-excel-lab/` es una copia **aislada** para evaluación, sin número de versión consecutivo, para no interferir con las versiones de Work.

## Disponible en Configuración de APR y OTROS

- Tarjeta plegable consistente con las tarjetas existentes: **SEGUIMIENTO Y ANÁLISIS PREVENTIVO · EXCEL**.
- Mes calendario o rango personalizado (desde/hasta).
- Opción para incluir reportes anteriores del laboratorio.
- Opción explícita para consultar **borrador y reportes anteriores de v258, solo lectura**, **del mismo usuario y módulo**, únicamente cuando estén guardados en este mismo navegador y origen.
- Botón **Actualizar resumen**, con conteos y lista de riesgos asociados.
- Botón **Generar Excel (.xlsx)** con las hojas REGISTROS, ACTIVIDADES, INDICADORES, ANALISIS_PREVENTIVO, INCIDENTES y TRAZABILIDAD.
- Reportes duplicados por el mismo ID se cuentan una sola vez, priorizando el informe del laboratorio.
- Se muestran riesgos y actividades relacionadas mediante la asociación existente por ID; no se deducen causas ni circunstancias que no hayan sido registradas.
- Se cuentan hallazgos por día de la semana, **no accidentes**.
- Se incluyen solo filas reales, sin filas vacías preconstruidas y sin inmovilización.

## Seguridad y límites
- No despliega SQL, no agrega columnas ni escribe a Supabase.
- `HYS257_ENABLE_USER_MANAGEMENT=false` solo dentro del laboratorio para prevenir acciones administrativas accidentales; en la copia de Work permanece intacto.
- Almacenamiento local propio: `hys-excel-v258-lab`, separado del de Work.
- Lectura opcional de v258 desde `hys-v255::<usuario>::<módulo>` con autenticación y módulo coincidentes; el acceso a IndexedDB origen v258 se realiza con transacciones `readonly` y comprobación de existencia.
- Si el navegador no permite consultar bases de datos sin crearlas, omite el archivo anterior de v258 y muestra advertencia.
- No incluye fotografías binarias ni da acceso a datos de otros usuarios.
- No equivale a un inventario central de todos los informes de empresa o área.
- Cierres formales, verificaciones, notificaciones confirmadas y accidentabilidad siguen como **Sin datos** si no tienen registros operacionales validados. Los estados `Completado` son declarativos.
- No se inventan notificaciones, accidentes, causas ni fechas de cierre.

## Pruebas realizadas
- JS validado con `new Function` en el entorno de pruebas.
- 27/27 aserciones preliminares de lógica y estructura XLSX con datos ficticios. 13 sobre hallazgos, indicadores, relación actividad-riesgo, módulos y exportación; 14 adicionales sobre lectura exclusiva de v258, aislamiento por usuario/módulo, exclusión de información ajena, transacciones IndexedDB `readonly`, hojas y ZIP.
- Pendiente: prueba autenticada completa en navegador para ambas tarjetas, validación de Excel en Microsoft Excel, lectura real de IndexedDB v258 en el mismo origen, controles de sesión, flujos PDF y regresión de los formularios de Work.
- No representa aprobación de producción ni trabajo publicado.

## Plan de integración posterior
Tras la validación en el laboratorio y comparación con el estado final de Work, trasladar solamente los archivos/aportes necesarios a una nueva versión autorizada.

### Limitación de validación
La generación XLSX se probó en lógica JavaScript con un entorno simulado; aún no se abrió el archivo resultante con Microsoft Excel ni se realizó una prueba integral autenticada en un navegador real. La exportación central desde Supabase permanece fuera de alcance.
