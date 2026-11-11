# Reportes HYS v246 — Ajuste de botones PDF en APR y OTROS

Fecha: 2026-11-05 · Rama: `desarrollo/v246` · Sitio de revisión: `https://reportes-hys-v246-revision.onrender.com/`

## Solicitud del usuario

Aplicar las mismas modificaciones en ambas tarjetas de módulos APR y OTROS:
1. Cambiar texto del botón «Generar PDF y compartir» por **«Generar PDF»**.
2. Agregar **«Imprimir»** a las opciones de la ventana de vista previa abierta luego de generar el PDF.
3. Colocar **«Finalizar informe»** inmediatamente a la derecha de **«Generar PDF»**.

## Implementación

Los dos módulos comparten `index.html` y distinguen el módulo mediante el parámetro `?embedded=otros`, por lo que se aplican cambios simétricos en la app de desarrollo y la vista aislada. Se mantienen «Guardar borrador» y «Nuevo informe» en una fila, y «Generar PDF» seguido de «Finalizar informe» en otra. Un estilo local fuerza la colocación contigua también en móviles.

Las opciones de la vista previa del PDF quedan: **Cancelar · Descargar PDF · Imprimir · Compartir PDF**. El botón Imprimir usa el visor PDF que ya se abrió para emitir el diálogo de impresión del navegador. Cuando el navegador impide imprimir desde el iframe, se abre el archivo PDF en una nueva pestaña y se informa al usuario que debe utilizar Imprimir del visor; si se bloquea la pestaña, se ofrece descargar para imprimir en el dispositivo.

El botón «Imprimir» anterior, que solo volvía a generar el PDF, se elimina para evitar duplicación/confusión. No se cambia el motor PDF, su paginación, fotos, nombre ni archivo local; compartir sigue disponible en la vista previa.

## Límites

La finalización sigue deshabilitada en la demo sin conexión. Este ajuste **no activa** el cierre del informe ni modifica permisos o auditoría. Queda intacta la aplicación oficial, v243, v244, v245 y Supabase. No reescribe PDF anteriores.

## Validación

`node --test v246/test-pdf-buttons-v246.cjs`. Revisión visual en APR y OTROS: orden de botones, generación PDF, opciones de descarga, impresión y compartir; no aprobar impresión real si el entorno impide probar el diálogo del navegador.
