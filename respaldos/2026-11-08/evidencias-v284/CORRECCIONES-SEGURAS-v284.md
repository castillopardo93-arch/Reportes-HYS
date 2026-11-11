# Reportes HYS · Correcciones seguras v284

**Fecha:** 8 de noviembre de 2026
**Rama:** desarrollo/v284-correcciones-seguras
**Carpeta nueva de trabajo:** v284-review/
**Origen protegido:** desarrollo/v283-regimen-de-turno / v283-review/
**Estado:** desarrollo aislado, no publicado, no aprobado.

## Reglas de ejecución

- Se copió íntegra la carpeta de v283 antes de modificar código.
- Los cambios se limitaron a v284-review/ en nueva rama, más evidencias y una CI aislada.
- No se editaron versiones anteriores, respaldos, main ni la aplicación oficial.
- No se efectuó ninguna escritura o despliegue en Supabase de producción.
- HYS242_ENABLE_CENTRAL=false y HYS242_DEPLOYMENT_READY=false se mantuvieron sin cambios.

## Correcciones aplicadas

### C01 · Cola de sincronización y modo local
Archivo: v284-review/cloud-v242.js.
onSave y onArchive ya no agregan nuevas operaciones a la cola remota cuando la sincronización central está desactivada. Las operaciones antiguas se conservan sin borrar ni enviar. Tampoco se convierte el PDF a base64 para un envío remoto que no ocurrirá.

### C02 · Conservar el informe anterior al crear uno nuevo
Archivo: v284-review/cloud-v242.js.
Se archiva localmente el borrador previo con datos editables cuando contiene información. No se archivan informes completamente vacíos. Si ya existe PDF y el formulario cambió, se exige regenerar el PDF para no sustituir silenciosamente una copia válida.

### C03 · Finalización validada
Archivo: v284-review/cloud-v242.js.
Se exige fecha del informe, período, responsable, turno, proyecto y área. Se rechazan períodos invertidos. El mensaje diferencia finalización local de confirmación en Supabase.

### C04 · Edición de informes con pendientes heredados
Archivo: v284-review/cloud-v242.js.
Las operaciones remotas antiguas no impiden para siempre la edición local. Se advierte el número de operaciones reservadas, se solicita confirmación y se descarga el respaldo del formulario antes de reemplazarlo; ninguna operación anterior se borra. Con servidor central activo se conserva el bloqueo de seguridad original.

### C05 · Fotos e Inicio independientes
Archivo: v284-review/index.html.
La tabla de Inicio ya no depende del número de fotografías por fila. Inicio mantiene dos columnas en escritorio y reglas de una columna en móvil. El selector y la generación PDF admiten de 2 a 8 fotos por fila.

### C06 · Fecha en archivo PDF
Archivo: v284-review/index.html.
El nombre utiliza la fecha del informe, con reserva de la fecha local únicamente si el dato no es válido.

### C07 · Almacenamiento explicado sin promesas falsas
Archivos: v284-review/cloud-v242.js y v284-review/index.html.
Configuración y Reportes anteriores informan que en v284 los informes están únicamente en el navegador. El control dice «Comprobar guardado local» y no «Sincronizar ahora».

## QA no destructiva

Archivo: evidencias-v284/test-regresion-v284.cjs
Comando: node evidencias-v284/test-regresion-v284.cjs

Workflow restringido a v284: .github/workflows/qa-v284.yml, sin secretos, sin despliegues, solo lectura de repositorio.

La suite revisa manifiesto, configuración de escritura, rutas, sintaxis de JS, fotografías, diseño de Inicio, fecha PDF, conservación y cola local, controles de guardado y cola en memoria. Las dos primeras ejecuciones con 13 verificaciones fueron exitosas:

- https://github.com/castillopardo93-arch/Reportes-HYS/actions/runs/42527199521
- https://github.com/castillopardo93-arch/Reportes-HYS/actions/runs/42527370949

La suite posteriormente se amplió para comprobar pendientes heredados y archivos vacíos. La ejecución más reciente de la rama aporta el resultado definitivo.

**Limitación:** sin pruebas autenticadas de extremo a extremo, navegadores reales, teléfonos, fotos grandes ni mutaciones reales de Supabase.

## Bloqueos pendientes, no solucionados

1. Creación real de usuarios y ficha laboral v279: backend ausente.
2. Regímenes v281 y catálogos v282: migraciones pendientes en Supabase.
3. Guardado central de informes: desactivado.
4. Notificaciones remotas: sin envío confirmado.
5. Ejecución, verificación, reasignación y cierre formal auditado: backend pendiente.
6. Número correlativo global único: requiere asignación transaccional del servidor.
7. Biblioteca de riesgos compartida entre dispositivos: sin persistencia central.
8. Registros de proyecto PHAM 1 y PHAM 2 en Supabase: requieren migración autorizada que preserve historial.
9. Advertencias del auditor de seguridad de Supabase: pendiente revisar funciones privilegiadas, grants y políticas.
10. Pruebas PC, móvil, dos tarjetas, roles y fotos: pendientes.

## Requisitos antes de publicar

Realizar pruebas reales de navegador y permisos, verificar backup/restore e integridad PDF, revisar seguridad, probar migraciones primero en entorno aislado y obtener autorización expresa para cualquier intervención de producción.

**Conclusión:** v284 corrige problemas concretos del flujo local, sin declarar que toda la aplicación esté lista para producción.
