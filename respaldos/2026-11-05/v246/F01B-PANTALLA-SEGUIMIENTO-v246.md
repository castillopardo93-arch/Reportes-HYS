# Reportes HYS — v246 · F01b — Ficha independiente de seguimiento de pendientes

Fecha: 2026-11-05
Rama: `desarrollo/v246`
Base: `desarrollo/v245` aprobada para continuar en desarrollo, NO publicada como versión oficial.

## Decisión funcional

Se aprobó crear una pantalla **independiente del formulario Informe Diario** para consultar los pendientes, evitando que al pulsar «Ver en Informe Diario» se abra directamente un formulario que el usuario o supervisor podría confundir con un permiso de edición.

### Nuevas funciones visibles
- Acceso permanente por menú **Mis pendientes** en APR y OTROS.
- La campana **Pendientes** abre directamente la ficha correspondiente en esa sección.
- Listado de tareas procedentes de los módulos admitidos por F01: APR tarjetas 1/2/3; OTROS solo hallazgos.
- Detalle con categoría de origen, título, tipo, estado de seguimiento, responsable vinculado, fecha compromiso, situación de plazo, descripción o medida propuesta.
- Contrato de estados respetado: se muestra exactamente la planificación local existente, sin inferir recepción de avisos, evidencia subida, verificación ni cierre.
- Panel de orientación sobre futuras etapas de seguimiento (avance, evidencia, revisión y auditoría), **no botones falsos**.
- Botón explícito «Volver al Informe Diario» por decisión del usuario; seleccionar un pendiente nunca abre el editor.
- Al guardar una tarea se actualiza la vista. La pestaña activa «pendientes» se conserva durante el flujo de navegación del navegador.

### Restricciones de seguridad
- `readScope` solo acepta informes cuyo `report.module` coincide exactamente con el módulo actual.
- La demostración aislada muestra pendientes del **equipo ficticio** para revisión visual. Fuera de demostración solo toma tareas asignadas al identificador de cuenta activa, y ese filtro del cliente **no sustituye permisos reales del servidor**.
- No hay ejecución, archivos, notificaciones enviadas, comprobantes de lectura, reasignaciones, finalización o modificación del informe desde esta pantalla.
- Los informes ya finalizados se consultarán **en una integración futura** mediante un backend autorizado; por ahora la ficha solo usa el informe actualmente abierto en la memoria de la aplicación. La demostración aún bloquea el botón «Finalizar informe» y no certifica acceso a archivos históricos.
- `main`, v243, v244, v245, Supabase y usuarios reales quedan intactos. `v246-review` replica una vista estática aislada y sin SDK Supabase.

### Pruebas previstas
`node --test v246/test-f01b-pending-detail-v246.cjs`. Antes de aprobar: prueba manual de campana → ficha en APR, menú Mis pendientes, detalle, alternancia con Informe Diario, OTROS, PDF sin efectos y permanencia de datos en el navegador.

## Próxima fase
Desarrollar flujo de ejecución, adjuntos, revisión, y notificación bajo permisos y auditoría de servidor independiente, y luego integrar reportes archivados (finalizados) sin modificar su contenido original. No dar por implementado ni habilitado ese flujo en v246.
