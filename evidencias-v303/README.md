# Reportes HYS v303 — Pilares e Indicadores

Fecha: 9 de noviembre de 2026. Rama aislada: `desarrollo/v303-periodos-alertas-tendencias`. Base protegida: v302 (`2274fc7334558344cc646ccfd0932ef403208540`).

## Cambios implementados
Se conservan los seis pilares, las cuatro tarjetas del resumen y la interfaz del Administrador General. La ampliación es exclusiva del módulo Pilares e Indicadores.

### Períodos disponibles
Mes actual, últimos 3 meses, últimos 6 meses, últimos 12 meses, últimos 24 meses, año actual, año anterior y personalizado. El período personalizado muestra dos campos `Fecha desde` y `Fecha hasta` con control de fechas inválidas, intervalos invertidos y fechas posteriores a hoy.

Cada selección genera un rango inclusivo y otro rango de comparación anterior. Los períodos móviles usan meses calendario incluyendo el mes actual hasta hoy. Los personalizados usan una ventana previa de igual número de días. **Los rangos se calculan para el diseño y la futura consulta; aún no consultan ni calculan indicadores de Supabase.**

### Mejoras de gestión
- Alertas de compromisos vencidos, hallazgos de prioridad alta, riesgos reincidentes y cierres por verificar.
- Dos bloques para evolución mensual y áreas/riesgos prioritarios.
- Indicaciones de trazabilidad documental y diferencia entre fecha del hallazgo y compromisos abiertos a la fecha de corte.
- Acción para consultar registros y respaldos preparada, pero **desactivada**, sin simular un historial central inexistente.
- No se ofrecen conteos, tasas ni gráficos inventados: la interfaz indica `—` o `Sin datos consolidados` hasta verificar fuentes y permisos.

### Seguridad y compatibilidad
- No se cambió ninguna base de datos, permiso, función RPC, almacenamiento, versión oficial o rama principal.
- Banderas de escritura central siguen apagadas.
- No se modificó el código de formularios, fotos, PDF, riesgos, notificaciones y usuarios.
- Se mantiene una sola versión visible al elegir tarjeta; sin rótulos de desarrollo dentro de Pilares e Indicadores.
- Metadatos para Power BI se describen sin crear una segunda fuente de verdad.

## Pruebas
`evidencias-v303/test-periodos-indicadores-v303.cjs` y regresión completa desde v302.

## Pendiente
Ejecución con autenticación real, consolidación de Supabase y revisión visual del panel en navegador confiable. No se ha desplegado ni publicado esta copia de desarrollo.
