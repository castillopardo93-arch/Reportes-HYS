# v257 — Tarjetas según autorización

Corrección reproducida en v256: solo se ocultaba el botón Ingresar; la tarjeta completa quedaba visible. Ahora se oculta toda la tarjeta no autorizada, se deshabilita su botón y ambas tarjetas comienzan ocultas hasta verificar permisos. Al cerrar/cambiar sesión se ocultan de nuevo. Se conserva el bloqueo de acceso por módulo y el ingreso de administradores al selector.

No se cambian roles, facultades, Supabase ni la app oficial. El guardado central y correlativo PDF permanecen desactivados.

## Gestión de cuentas y facultades habilitada por separado

HYS257_ENABLE_USER_MANAGEMENT=true permite listar/editar cuentas existentes y asignar facultades mediante las RPC ya instaladas. Se conserva central_enabled=false y deployment_ready=false: informes, invitaciones y correos no quedan habilitados. Los cambios que el usuario confirme en estos formularios sí modifican cuentas/facultades operativas en Supabase y generan la auditoría de servidor existente. Solo el Administrador general asigna facultades; un administrador delegado no puede autoampliarse. No se ha aplicado ninguna asignación por desplegar esta interfaz.
