# Reportes HYS · v283 — Régimen de turno y corrección de catálogo de Proyecto

Fecha: 2026-11-08
Rama aislada: `desarrollo/v283-regimen-de-turno`
Base: `desarrollo/v282-areas-opciones-unificadas`
Estado: desarrollo de prepublicación, sin publicación ni modificaciones de producción.

## Causa real del desfase de Proyecto

La consulta de solo lectura a Supabase confirmó que `public.listas_v242`, selector `project`, contiene:

| Módulo | Valor | Activo |
|---|---|---|
| APR | PHAM 1 | Sí |
| APR | PHAM 2 | Sí |
| OTROS | PHAM 1 | Sí |
| OTROS | PHAM 2 | Sí |

La instrucción de configuración vigente para **ambas tarjetas** es dejar solo **Proyecto Hidroeléctrico Alto Maipo**. El catálogo central aún no está sincronizado con esa instrucción. Por eso la v282 seguía leyendo opciones antiguas. No se alteraron registros reales ni informes históricos.

## Corrección del formulario Proyecto

- En un nuevo informe, la lista activa deja fuera **PHAM 1 / PHAM 2**, que están identificados como anteriores.
- Se conserva como denominación vigente **Proyecto Hidroeléctrico Alto Maipo** mientras Supabase sigue con las opciones antiguas. Esto es una configuración aprobada del frontend, **no una afirmación de que la base de datos ya fue corregida**.
- Si se abre un informe previamente creado con PHAM 1 o PHAM 2, conserva su valor exacto en el informe histórico y se identifica como opción **solo de informe histórico**, sin reescribir silenciosamente su contenido.
- Si posteriormente se habilitan otros proyectos válidos mediante la administración real, podrán aparecer en el selector.
- En **Áreas y opciones → Opciones de formularios → Proyecto** se presenta la denominación vigente, marcada **pendiente de registrar en Supabase** si el registro todavía no existe. Los valores antiguos se agrupan aparte, bajo el encabezado **Valores anteriores en Supabase**, con posibilidad futura de desactivarlos por una operación autenticada y auditada.

## Corrección de Régimen de turno

- Nombre exacto del selector de gestión: **Régimen de turno**.
- Nombre exacto de su casilla de creación: **Régimen de turno**.
- Nombre en la ficha laboral y de contacto: **Régimen de turno**.
- Valores separados por registro: **5x2**, **4x3**, **10x5**, **7x7**.
- Cada registro mostrará individualmente **Editar régimen**, **Desactivar** y **Reactivar** cuando el backend y el registro existan.
- Si la tabla independiente `regimenes_laborales_v281` aún no existe, estos cuatro códigos se presentan individualmente como **pendientes de registrar en Supabase**, con botones deshabilitados; **no se fabrican datos persistidos ni se simula un guardado**.
- Se mantiene la separación absoluta respecto de `listas_v242.shift` (turno Día/Noche del informe).

## Pendiente de autorización: sincronizar los proyectos centrales

**No se ha ejecutado ningún cambio en la base.** Tras autorizar instalar el backend administrativo `hys282_catalogo_mutar`, el Administrador general deberá realizar en este orden y con auditoría:

1. En **APR / Proyecto**, crear el valor **Proyecto Hidroeléctrico Alto Maipo**.
2. Comprobar que se lee correctamente; desactivar **PHAM 1** y **PHAM 2**, sin eliminarlos.
3. Repetir el mismo procedimiento en **OTROS / Proyecto**.
4. Verificar las dos tarjetas, ingreso nuevo, borradores existentes, historial de informes, PDFs, validación de permisos y auditoría.
5. Validar visualmente que los registros antiguos permanecen consultables como históricos pero no son opciones activas para informes nuevos.

El SQL de backend existente en `propuestas-backend-v282/GESTION-UNIFICADA-AREAS-Y-LISTAS-v282.sql` está disponible en esta misma rama. **Debe revisarse y autorizarse antes de ejecutarlo**. El proyecto publicado, `main`, Auth, datos operativos y versiones protegidas permanecen intactos.

## Verificación

- La estructura de los 49 bloques JavaScript embebidos de `index.html` pasa comprobación de sintaxis; también los principales scripts externos modificados.
- **5/5 pruebas de la selección Proyecto**: nuevo informe con denominación vigente, exclusión de PHAM 1/2 en nuevo informe, conservación histórica del proyecto antiguo, lectura de catálogo corregido y soporte a nuevos proyectos legítimos.
- **11/11 pruebas de estructura del administrador**: nombre exacto del selector, cuatro registros independientes pendientes, botones individuales bloqueados hasta conexión real, valores históricos agrupados y advertencia de discrepancia con Supabase.
- **No hay pruebas de navegador real ni de escritura autenticada**; estas quedan pendientes.

## Reglas de conservación

No tocar `main`, la aplicación publicada, respaldos ni las versiones v281/v282. No modificar Supabase/producción sin autorización específica. No utilizar el modo laboratorio en la aplicación principal.
