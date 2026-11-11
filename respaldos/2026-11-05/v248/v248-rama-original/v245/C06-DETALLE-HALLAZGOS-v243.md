# C06 — Detalle plegable de Hallazgos: Seguimiento, Notificaciones, Historial / cierre

**Reportes HYS — Rama exclusiva `desarrollo/v243`**  
**Fecha:** 2026-11-05  
**Estado:** interfaz integrada en desarrollo. No publicada. Cierre sujeto a aprobación y pruebas visuales.

## Qué incorpora
En cada registro de Hallazgos de APR y OTROS se agrega una **fila auxiliar** debajo del registro y de sus detalles de fotografías, riesgos, responsables y fecha compromiso. Incluye un `<details>` nativo con el resumen **«Ver detalle y seguimiento del hallazgo»** y tres pestañas:

1. **Seguimiento**. Muestra **datos realmente existentes del hallazgo**: condición detectada, medida propuesta, responsable registrado, estado y fecha compromiso. Identifica expresamente como pendiente la gestión de avances y medidas individuales de C07–C09.
2. **Notificaciones**. Contiene un mensaje explícito de que **todavía no hay registros de avisos por hallazgo ni se ha enviado correo**. Notificaciones reales, bandeja y confirmaciones pertenecen a F01–F07.
3. **Historial / cierre**. Muestra el estado actual y advierte que **«Completado» no equivale a un cierre formal, verificado y auditado**. Historial de correcciones, reaperturas y cierre pertenece a C07–C09.

El panel es **de solo lectura**, sin acciones decorativas para «Enviar», «Cerrar» o «Reabrir». No se agregan registros ficticios de historial ni notificaciones, ni cambios de estado automáticos.

## Compatibilidad
- Las **siete columnas** de Hallazgos permanecen iguales, incluidas las proporciones originales de C01.
- Se conservan campos de C02 en `[0..4]`, fotografías en `[5]`, riesgos de C03, asignaciones de C04 y fecha compromiso de C05 dentro de los metadatos `[6]`.
- No se altera guardado, sincronización, PDF, datos históricos ni usuarios reales. El panel visual no se exporta como hoja adicional en impresión; datos PDF existentes se mantienen.
- El texto de usuario se inserta con escape HTML, sin interpretar etiquetas aportadas en el hallazgo.
- La pestaña activa se gestiona con `role=tab`, `aria-selected`, `aria-controls`, `role=tabpanel` y controles de teclado ← → Inicio Fin.
- Cada registro es un `<details>` independiente, sin desplegar los demás.
- Al re-renderizarse la tabla (guardar/editar/eliminar), los paneles retornan cerrados. Es comportamiento provisional de C06; no se persisten estados de UI.

## Archivos de esta etapa
- `v243/index.html`: carga los dos nuevos recursos y añade el detalle después de las filas auxiliares existentes.
- `v243/finding-detail-v243.js`: composición accesible de las tres pestañas, escape HTML, interacción por clic/teclado, sin red.
- `v243/finding-detail-v243.css`: presentación en escritorio/móvil, sin nuevas columnas; ocultación del panel durante impresión.
- `v243/test-c06-v243.cjs`: 15 pruebas unitarias y de contrato con datos sintéticos.

## Límites y validación pendiente
- No están desarrollados C07–C09: correcciones por responsables, cierre global condicionado y auditoría de reapertura.
- No están desarrollados F01–F07: envío real de avisos y confirmación de lectura.
- Requiere prueba visual con varios hallazgos, textos largos, fotos, roles, navegación de teclado y móvil.
- No se ha habilitado Supabase de desarrollo independiente. `HYS242_ENABLE_CENTRAL=false` y `HYS242_DEPLOYMENT_READY=false` siguen vigentes.
- No tocar `main`, v242, cuentas, bases reales ni aplicación oficial; enlace independiente de revisión al terminar C10.

**Próximo punto:** C07, corrección y cierre directo por responsables **verificados y autorizados**, con evidencia y trazabilidad. Su ejecución real requerirá diseño y pruebas de autorización en backend aislado. No simular cierre oficial.
