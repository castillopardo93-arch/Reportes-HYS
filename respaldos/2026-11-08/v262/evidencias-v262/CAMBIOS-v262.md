# Reportes HYS — v262 Roles unificados
Fecha: 2026-11-08. Base inmutable v261 (commit `5e560e479e003a71ebb2d3579088ead2182d3b40`). Rama: `desarrollo/v262-roles-unificados`.

## Corrección solicitada
La v261 no permitía cambiar el rol desde Facultades. La v262 incorpora, en la ficha del usuario seleccionada por Administrador general, un selector **Usuario / Supervisor / Administrador**, seguido de selección independiente de ambas tarjetas y áreas, y facultades especiales solamente para Administrador. Se evita que Usuarios permita modificar el rol de cuentas existentes desde un segundo lugar; al invitar cuentas nuevas se mantiene la selección inicial.

## Resultado y seguridad
- Selector de rol operativo en la **demostración aislada** y en el código de v262, solo para Administrador general.
- Cambiar a Administrador muestra atribuciones por tarjeta sin otorgarlas automáticamente; al seleccionar Usuario/Supervisor las oculta.
- El guardado de roles requiere una transacción única de servidor para actualizar rol, accesos, áreas y revocar o conceder facultades. El nombre del RPC previsto es `hys262_guardar_rol_y_facultades_atomico`. **No se creó ni desplegó** ese RPC.
- Configuración de laboratorio: `HYS257_ENABLE_USER_MANAGEMENT=false`, `HYS262_ATOMIC_ROLE_READY=false`, `HYS261_ATOMIC_FACULTIES_READY=false`. No se realizan cambios de usuario real ni escrituras de producción.
- En esta fase, el botón indica **«Revisar cambios (sin guardar)»**.
- Estado de informes, fotos, PDF y flujo principal: heredados de v261 sin nuevas modificaciones funcionales.
- Almacenamiento local usa prefijo específico v262, sin compartir colas de borradores con otras versiones.
- Modo sin conexión explícitamente fuera de alcance.

## Pruebas
- 31 verificaciones de modelo, acceso, carga de dependencias, sintaxis de código, guardado protegido y **9 scripts HTML internos** aprobadas en revisión ejecutable.
- Navegador: con cuenta ficticia Supervisor se seleccionó Administrador; aparecen facultades especiales en ambas tarjetas. Al cambiar a Usuario desaparecen. Ambas tarjetas permanecieron visibles; no se detectaron errores de interfaz en ese recorrido. No se pulsó guardar ni se probó persistencia real.
- Prueba reproducible añadida: `evidencias-v262/test-roles-v262.cjs` (requiere ejecutar Node para obtener sus resultados independientes).

## Pendiente para uso real
Implementar y probar el RPC atómico en un entorno no productivo, verificar autorización de Administrador general, bloqueo de autoconcesión de administrador global, revisiones de concurrencia y revocación de facultades, además de RLS y auditoría. La activación contra Supabase de producción requiere autorización expresa del usuario.

## Versiones protegidas
No se alteraron `main`, v259, v260 ni v261, ni se desplegó Supabase. v262 queda como versión independiente **no aprobada ni publicada**.
