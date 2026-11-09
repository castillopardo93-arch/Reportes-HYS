# Reportes HYS — v300 · Limpieza de interfaz y permisos

9 de noviembre de 2026. Rama `desarrollo/v300-interfaz-sin-versiones-y-acceso-por-tarjeta`, base inalterada `desarrollo/v299-lecturas-historial-por-modulo` (b9bd12c1e158d86f91b55835d90c8c2772e6b5ad).

## Incidencias corregidas

1. **Versiones en interfaz**: el único número de versión visible se mantiene en `moduleChooser` como `v300`; fuera se elimina la franja de `v289`, el mensaje de lectura `v298` y los textos administrativos `v242`/`v287`. La personalización de Apariencia respeta el mismo rótulo.
2. **Tarjeta única**: un usuario, supervisor o administrador delegado con exactamente un módulo entra directamente a la tarjeta autorizada y ya no recibe el botón `Cambiar módulo`. No puede navegar al selector sin necesidad.
3. **Administrador General**: mantiene la pantalla principal y, si posee una sola tarjeta, el botón de regreso se denomina `Panel general`; si posee más, `Cambiar módulo`.
4. **Seguimiento y herramientas laterales**: el botón de seguimiento y las herramientas administrativas aparecen exclusivamente en el selector del Administrador General y requieren su rol en la apertura de operaciones; el servidor mantiene RLS.
5. **Cerrar sesión**: el botón del selector se renombra de `Cambiar usuario` a `Cerrar sesión`, que es lo que realmente ejecuta.

## Protección
Sin modificación de datos reales, funciones ni permisos de Supabase. Sin alteración de `main`, aplicaciones oficiales, versiones protegidas ni despliegues. Lecturas autenticadas siguen sujetas a RLS y las escrituras centrales continúan apagadas.

## Pruebas
`evidencias-v300/test-interfaz-permisos-v300.cjs` y regresión acumulada desde v299. La prueba visual con usuarios reales sigue pendiente y no se debe hacer usando credenciales en visores externos.
