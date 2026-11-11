# Reportes HYS — C04: responsables por identidad única en Hallazgos

**Fecha:** 2026-11-05  
**Rama:** `desarrollo/v243`  
**Estado:** interfaz y contrato de compatibilidad implementados; directorio real pendiente de entorno aislado.

## Objetivo
Permitir seleccionar varios responsables entre personas con cuentas vigentes y autorización del módulo APR/OTROS, usando un UUID de identidad para evitar confundir dos personas de igual nombre.

## Diseño implementado en interfaz
- Selector complementario dentro del formulario de Hallazgos, sin modificar las siete columnas ni la secuencia `[condición, prioridad, medida, responsable, estado, fotos, metadatos]`.
- El nuevo metadato `record[6].assignees` contiene instantáneas `[{user_id,nombre,modulo}]`, junto a `risks` de C03 y `category` de OTROS.
- Permite seleccionar uno o varios usuarios, buscarlos por nombre ignorando tildes y quitar selecciones. Máximo 30 identificadores.
- Solo presenta como candidatos los registros explícitamente marcados **activos** y **puede_ver=true** del módulo actual; estos filtros del navegador son defensa adicional, **no una autorización**.
- Dos personas con igual nombre conservan distintos UUID.
- Conserva los textos históricos en la columna Responsable sin asignarles una identidad por coincidencia de nombre. Si hay identificadores vinculados, el texto de Responsable se sincroniza con sus nombres al guardar. Si no hay IDs, se conserva el texto histórico salvo que el usuario retire explícitamente una asignación.
- Los nombres seleccionados se muestran bajo el registro y en la instantánea guardada. Sus IDs permanecen en metadatos para futuros seguimientos y notificaciones.
- La selección existente se conserva aunque el directorio no responda. Si no hay fuente de usuarios, no inventa nombres ni permite crear nuevas asignaciones verificadas.

## Límite de integración — imprescindible
**No está habilitada una conexión de v243 a Supabase.** `config-v242.js` mantiene las banderas centrales en `false`. La función heredada `hys242_listar_usuarios()` exige facultades administrativas y **no es adecuada** para un selector general de responsables. `hys242_filtros_usuarios()` solo lista autores de informes existentes, por lo que también es insuficiente.

El selector usa un proveedor inyectable, inicialmente desconectado. Se activará únicamente tras la creación y auditoría de un backend de pruebas aislado que cumpla este contrato de lectura:
- Entrada: módulo APR/OTROS y contexto autenticado; proyecto y área autorizados cuando existan.
- Respuesta mínima: `[{usuario_id, nombre, modulo, activo, puede_ver}]`, sin correos personales, teléfonos, contraseñas ni claves de servicio.
- El backend verifica identidad, estado activo del solicitante, permiso para visualizar/editar en el módulo y ámbito permitido; filtra identidades activas y legibles del mismo módulo, sin exponer usuarios ajenos.
- Si el solicitante intenta guardar asignaciones, el backend vuelve a validar **cada UUID** y su módulo/área/proyecto **en ese momento**, antes de escribir. No confiar en flags de JavaScript ni en IDs enviados por el navegador.
- Auditar nuevas asignaciones, cambios y bajas; autorización por alcance y creación de notificaciones se programarán y revisarán en C05–C10/F.
- Prohibido exponer `service_role` y conceder `EXECUTE` anónimo a funciones privilegiadas.
- Cuando se apruebe un proyecto de ensayo, conectar un proveedor de directorio estrictamente de solo lectura mediante `Hys243Assignees.setProvider(fn)` y activar `HYS243_DIRECTORY_ENABLED` y `HYS243_DIRECTORY_ISOLATED` **solo después** de acreditar las barreras del servidor. No activar esas opciones en producción.

## Pruebas
`test-c04-v243.cjs`: 15 pruebas de datos sintéticos y contrato de integración. No equivalen a pruebas con usuarios reales.

## Pendientes antes de aprobar funcionalmente C04
- Backend aislado, RPC para directorio autenticado y autorización de cada asignación en el servidor.
- Casos reales: usuario APR, usuario OTROS, usuario con ambos módulos, supervisor, administrador de área y administrador general.
- Usuarios inactivos, permisos revocados, nombres duplicados y asignaciones históricas sin identidad.
- Revisión visual en PC, Android e iPhone y de PDF. No publicar hasta terminar C10 y autorizar despliegue de revisión.

## Seguridad y continuidad
No modificar main, v242, aplicación oficial, funciones de Supabase ni cuentas existentes. Cambios de C04 solamente en `desarrollo/v243`. El enlace de revisión se preparará al cerrar C10.
