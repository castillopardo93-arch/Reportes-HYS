# C05 — Fecha compromiso en Hallazgos APR/OTROS

**Fecha de trabajo:** 2026-11-05  
**Rama:** `desarrollo/v243`  
**Estado:** implementado en desarrollo, no publicado; aprobación y pruebas visuales pendientes.

## Alcance
Incorporar un único dato complementario realmente necesario: **Fecha compromiso** (día, mes, año), utilizado para señalar cuándo se acordó ejecutar la medida propuesta. La condición, prioridad, medida propuesta, responsable y estado ya cubren la información restante imprescindible del registro; por eso no se duplican ni se añaden nuevas columnas.

### Diseño y comportamiento
- Campo de calendario `input[type=date]` en el formulario de Hallazgos de APR y OTROS.
- **Opcional** para conservar hallazgos antiguos e informativos, sin imponer una fecha ficticia. No impide editar registros históricos.
- Guardado en `record[6].dueDate`, formato `YYYY-MM-DD`; visualización `DD/MM/YYYY`.
- Validación de fecha real y años bisiestos, con bloqueo del guardado ante dato inválido; no se ajusta automáticamente a la fecha actual ni se cambia la zona horaria.
- Permite editar o quitar una fecha; ninguna operación cambia el Estado por sí sola.
- Se muestra debajo de la fila principal (nunca como octava columna) y aparece en el PDF únicamente cuando existe.
- Conserva las cinco celdas existentes `[0..4]`, adjuntos en `[5]`, y en metadatos `[6]` los datos `category` (OTROS), `risks` (C03), `assignees` (C04), así como cualquier atributo histórico no sustituido.
- No se implementan aún avisos, vencimientos calculados, responsables por acción, recordatorios o historial de seguimiento; corresponden a C06–C10 y F.

## Archivos
- `index.html`: modal, validación, metadatos, fila auxiliar y grupo PDF.
- `commitment-v243.js`: lectura, validación y formato sin conectividad externa.
- `commitment-v243.css`: controles responsive sin cambiar siete columnas.
- `test-c05-v243.cjs`: 15 pruebas estructurales y funcionales con registros sintéticos.

## Límites y controles
- `config-v242.js` continúa con `HYS242_ENABLE_CENTRAL=false` y `HYS242_DEPLOYMENT_READY=false`.
- No existe servidor `v243` aislado ni instalación Supabase de v243 autorizada. **No conectar la interfaz de desarrollo con la base real.**
- La fecha se guarda en el modelo local heredado de informe; la edición con cuentas reales y la revisión en navegador todavía no están verificadas.
- No tocar `main`, la versión oficial, los respaldos ni cuentas reales. No publicar esta etapa; enlace web de revisión posterior a C10.

## Pruebas de aceptación pendiente de ejecutar en navegador
1. Abrir APR y OTROS; cargar hallazgo antiguo sin fecha y sin pérdida de fotos.
2. Elegir fecha, guardar como borrador, recargar, editar y confirmar persistencia.
3. Quitar fecha en ambos módulos; comprobar texto Responsable, riesgos, identificadores y fotografías.
4. Verificar PDF y saltos de página para registros largos y con múltiples evidencias.
5. Verificar en PC, Android y iPhone; asegurar que la fecha de calendario no se desplaza por zona horaria.
6. Revisión integral C01–C10 y servidor de ensayo aislado antes de habilitar el enlace.

**El cierre funcional de C05 requiere aprobación del usuario y pruebas reales posteriores.**
