# Reportes HYS v304 — Pilares e Indicadores integrados en la interfaz real

La nueva versión v304 toma v303 (fa01b15383dd4ff453485504f33fdcbc84957c50) como base aislada y está en `desarrollo/v304-pilares-integrados-interfaz`.

## Qué cambió
- La misma pantalla de Pilares e Indicadores se encuentra dentro de **Reportes HYS**, desde la opción de Administrador General. No se depende de una página independiente.
- Se agregaron cuatro controles de navegación funcionales dentro de ese panel: **Resumen, Alertas, Tendencias, Seis pilares**. Permiten regresar desde cualquier detalle, desplazar y enfocar la sección seleccionada.
- Los filtros de ocho períodos, fecha personalizada y tarjeta/área permanecen en la pantalla principal y ahora incluyen el control **Restablecer filtros**, con comprobación del alcance visible.
- Las cuatro alertas presentan un detalle desplegable sobre sus reglas de interpretación, sin inventar resultados.
- Se conserva el contenido de los seis pilares y su explicación documental.
- La visualización desde `v304-review/index.html?revision=pilares` utiliza **el mismo código y pantalla de la app**, con datos reales bloqueados y sin necesidad de credenciales; no es otra implementación que pueda divergir. El modo de revisión visual está limitado a esa ruta, es de solo presentación y no habilita facultades ni escrituras.

## Precauciones
No hay métricas reales, listas de riesgos, PDF consolidado o persistencia en Supabase en este panel todavía; no se muestran números falsos. El estado sigue indicando que falta validación central.

No se cambian `main`, la aplicación oficial, Supabase, respaldos protegidos ni versiones anteriores.

## Pruebas
`evidencias-v304/test-interfaz-integrada-v304.cjs` y `.github/workflows/qa-v304-panel-integrado.yml`, más batería de regresión v303 a v284.

## Pendiente
Prueba con credenciales reales en entorno confiable, comparación de datos centrales cuando se autorice, y revisión visual por el usuario.
