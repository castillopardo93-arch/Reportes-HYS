# Reportes HYS — C03: Selector de riesgos de Hallazgos (APR/OTROS)
Fecha: 2026-11-05 | Rama: `desarrollo/v243` | Estado: desarrollo sin publicar.

## Función implementada
- En el formulario de Hallazgos de ambos módulos, agregar un selector de riesgos con búsqueda por código y nombre.
- Ignorar mayúsculas y tildes, permitir términos compuestos, selección múltiple y eliminación de selecciones.
- Conservar los cinco campos originales en índices 0–4, las fotos en índice 5 y metadatos en índice 6. En OTROS también conservar `category`.
- Guardar en `record[6].risks` instantáneas `{code,name}`, para mantener información legible aunque un catálogo futuro cambie.
- Mostrar riesgos debajo de la fila principal, sin agregar columnas, y mostrar las instantáneas en el PDF como detalle opcional.
- Carga local opcional JSON o CSV, mediante selector de archivo, validación de campos y duplicados, y almacenamiento en `localStorage` bajo la clave `reportes-hys-v243-risk-catalog-v1`.
- No emitir solicitudes a Supabase ni a servicios externos desde el selector; el catálogo se consulta localmente mientras la página esté abierta y, tras una importación exitosa, se conserva en este navegador.
- No incrustar riesgos de ejemplo ni afirmar que el catálogo de +500 riesgos haya sido cargado.

## Límites y dependencias
1. **Excel pendiente de H01–H04**. JSON/CSV es una entrada provisional de pruebas locales, no equivale a integración Excel aprobada. Los dos Excel reales deben revisarse antes de cualquier carga oficial.
2. **No existe versión servidor `hys243` ni esquema de datos independiente**. El formulario heredado conserva la integración central desactivada en `config-v242.js`. No ejecutar v243 conectado a datos de producción.
3. **Offline acotado**: la búsqueda del catálogo importado funciona sin red *con la página ya abierta*; la apertura total offline, PWA, sincronización, multidevice y conflictos pertenecen a G01–G06.
4. **Compatibilidad heredada**: conservar el objeto `record[6]` (categoria OTROS y cualquier clave futura); no reordenar campos, fotos ni botones. Los hallazgos antiguos sin `risks` siguen válidos.
5. **Privacidad y alcance**: no introducir datos personales al catálogo. Un catálogo local se comparte entre pestañas y módulos del mismo origen/navegador; el aislamiento multiproyecto se diseñará en M.
6. **Seguridad**: importar solo catálogos aprobados, sin procesar macros Excel. Las entradas se muestran escapadas o con `textContent`; importación inválida y errores de cuota no sustituyen el catálogo previo.

## Archivos modificados o añadidos
- `index.html`: conexión de script y CSS, selector dentro del modal Hallazgos, metadatos de selección, detalle opcional en tabla/PDF.
- `risk-catalog-v243.js`: validación, normalización, búsqueda, selección y almacenamiento offline.
- `risk-selector-v243.css`: diseño adaptable del selector y línea de riesgos sin alterar siete columnas.
- `test-c03-v243.cjs`: 15 pruebas de regresión con Node.

## Criterios de aceptación aún pendientes
- Ejecutar `node --test test-c01-v243.cjs test-c02-v243.cjs test-c03-v243.cjs` sobre la misma rama después de comprobar el entorno.
- Probar visualmente APR/OTROS, búsquedas con y sin tilde, selección y eliminación, catálogos de más de 500 riesgos aprobados, recarga del navegador y mensajes de error.
- Probar compatibilidad de PDF y edición con fotos, tanto en PC como en Android/iPhone.
- Validar que las restricciones de acceso se mantengan con cuentas de prueba reales cuando se habilite un servidor de ensayo **aislado**.
- No publicar, no tocar `main`, ni crear, borrar o editar información en Supabase sin aprobación.

**Estado de aprobación:** pendiente de revisión del usuario. Después corresponde C04 (identidades de responsables) solo si el usuario autoriza.
