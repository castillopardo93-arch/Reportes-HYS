# Reportes HYS v301 — Gestión rápida de permisos

**La quinta opción se agregó dentro de Gestión de usuarios**, junto a las cuatro pestañas originales: Crear usuario, Usuarios registrados, Historial, Mis datos laborales y **Permisos y facultades**.

Permite buscar y elegir un usuario registrado para preparar cambios de rol, acceso a tarjetas, áreas y facultades especiales. Se reutilizan los controles actuales de los pasos 3 y 4, sin la ficha laboral ni la creación de cuentas.

La validación de permisos y el motivo del cambio se pueden revisar en pantalla, pero **no se modifican usuarios reales**: el botón de guardado permanece deshabilitado hasta contar con migración y operación transaccional auditada en Supabase. No se ha modificado Supabase ni la aplicación oficial.

Versiones anteriores conservadas; la v301 solo se encuentra en `desarrollo/v301-permisos-facultades-acceso-rapido`. Pruebas automáticas en `evidencias-v301/test-gestion-rapida-v301.cjs`.
