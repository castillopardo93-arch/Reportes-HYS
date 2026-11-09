# Reportes HYS — v285 · Tarjeta Pilares e Indicadores

Fecha: 9 de noviembre de 2026
Rama: desarrollo/v285-pilares-indicadores
Carpeta nueva: v285-review/
Base protegida sin cambios: desarrollo/v284-correcciones-seguras / v284-review/

## Función creada

Una nueva **opción de Administración General** llamada **Pilares e Indicadores**, colocada en la misma cinta lateral que Usuarios, Áreas y opciones, Seguimiento y Apariencia. No se agrega una tercera tarjeta operativa ni se alteran Prevencionistas y Supervisores/Capataces.

Al abrir se presenta:
- Encabezado con ciclo Detectar → Comunicar → Corregir → Verificar → Mejorar.
- Filtros Período, Tarjeta de origen y Área de trabajo.
- Resumen ejecutivo con cuatro métricas **sin valores**, explícitamente pendientes de conexión central.
- Seis tarjetas clicables: Eficiencia en terreno; Gestión y cumplimiento; Indicadores de gestión; Gestión documental; Seguridad y trazabilidad; Mejora continua.
- Cada tarjeta abre una vista interna con tres indicadores, fórmula descriptiva y fuente de información. Se puede volver sin salir de la pestaña.
- Explicación de metodología futura, y exportación ejecutiva deshabilitada hasta disponer de resultados auditables.

## Acceso y seguridad

En la aplicación principal la opción se muestra exclusivamente cuando el usuario tiene perfil activo, rol administrador_global, y está en la pantalla principal de selección de módulos. El módulo OTROS embebido no crea esta pantalla.

La consulta de áreas es solo lectura de areas_trabajo_v242, con las políticas RLS existentes. Los cambios de usuario/rol ocultan y cierran la tarjeta. No hay operaciones INSERT, UPDATE, DELETE ni llamadas a endpoints de escritura.

Existe una página **de previsualización independiente** (pilares-indicadores-preview-v285.html) que abre el diseño sin sesión, sin cliente ni datos reales. La excepción de acceso se limita al nombre exacto de esa página. No autoriza el acceso a datos, módulos ni funciones administrativas de la aplicación.

## Alcance y límites

- Este entregable es **estructura funcional de interfaz**, no el motor de cálculos.
- No se generan porcentajes ni resultados ficticios.
- Los filtros delimitan el contexto visual; el cálculo por área, mes y tarjeta seguirá bloqueado hasta que exista fuente central confirmada.
- La conexión real de informes, notificaciones, cierres, eficacia y exportación PDF/Excel sigue pendiente.
- No se modificó Supabase de producción, main, app publicada ni versiones anteriores.
- La pantalla no ha pasado una validación visual manual completa en navegador con una sesión real de administrador.

## Archivos nuevos y modificados

- v285-review/pilares-indicadores-v285.css — diseño adaptable.
- v285-review/pilares-indicadores-v285.js — interfaz de seis pilares y control de acceso.
- v285-review/pilares-indicadores-preview-v285.html — previsualización aislada.
- v285-review/index.html — carga de CSS y JS nuevos.
- v285-review/gestion-usuarios-v265.js — reconoce el nuevo botón y protege cambios no guardados al pasar entre herramientas.
- v285-review/MANIFIESTO.json — versión y alcance.
- evidencias-v285/test-pilares-v285.cjs — pruebas de DOM, acceso y navegación.
- .github/workflows/qa-v285-pilares.yml — CI no destructiva.

## Pruebas

Ejecutadas en GitHub Actions: 18 casos de navegación, acceso y DOM + 16 regresiones de v284. Total: **34 pruebas automáticas aprobadas**.

Primera ejecución exitosa: https://github.com/castillopardo93-arch/Reportes-HYS/actions/runs/42595330052

Se comprobaron: compilación sintáctica, integración de archivos, aparición de la tarjeta en administración, seis pilares, navegación a detalles, filtros, apertura/cierre, tecla Escape, cuatro indicadores sin valores falsos, denegación a usuarios sin privilegios, lectura RLS de áreas y ausencia de escrituras en el cliente simulado.

## Próxima revisión conjunta

1. Confirmar si gusta la posición «Pilares e Indicadores» en la cinta lateral.
2. Revisar tamaño, colores, distribución de seis tarjetas en PC y móvil.
3. Revisar nombres, objetivos y los tres indicadores inicialmente descritos en cada pilar.
4. Decidir si el resumen ejecutivo se deja visible en la portada o solo dentro de la pestaña.
5. Tras aprobar interfaz, diseñar contratos y consultas de indicadores verificados, y ejecutar pruebas autenticadas en ambiente aislado.

Estado: **versión de diseño para revisión; NO publicada y NO aprobada para producción**.
