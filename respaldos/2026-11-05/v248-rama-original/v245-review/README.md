# Reportes HYS v245 — vista previa aislada

La demostración v245 parte de la versión v244, que superó la revisión visual de los bloques D y E. Su nueva función F01 agrega una campana de **pendientes de planificación local**, sin notificaciones enviadas.

Abre APR u OTROS, crea acciones individuales en Hallazgos o actividades clasificadas como tarea (solo APR), guarda y usa la campana para ver el contador y la bandeja. En la **vista ficticia**, puedes filtrar por todo el equipo simulado o por uno de sus usuarios sin alterar credenciales ni permisos. El botón «Ver en Informe Diario» navega al bloque correspondiente. Ninguna acción marca una tarea como leída o cumplida.

No usar esta demostración para información real. Los cambios de formularios quedan solo en el navegador, las fichas y las áreas de E solo en memoria temporal. No hay Supabase, correo, push, autorizaciones reales ni auditoría central.

**Publicar la demo exclusivamente como sitio aislado**, ejecutando `sh v245-review/build-preview.sh` en el repositorio y sirviendo `v245-review/` con **autoDeploy desactivado**. Nunca modificar la aplicación oficial o usar claves de producción.
