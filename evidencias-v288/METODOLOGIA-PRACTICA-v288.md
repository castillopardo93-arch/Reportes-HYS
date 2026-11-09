# Reportes HYS · v288 · Metodología práctica de indicadores

**Fecha:** 9 de noviembre de 2026
**Base:** v287 (copia aislada)
**Rama:** `desarrollo/v288-verificacion-indicadores`
**Carpeta:** `v288-review/`
**Estado:** desarrollo para revisión conjunta; no publicado ni autorizado para producción.

## Cambios realizados

1. Título de la sección explicativa: **Cómo se calcula y verifica**, reemplazando «Metodología y trazabilidad futura».
2. Explicación breve organizada para contestar las tres preguntas operativas:
   - ¿Qué está pasando?
   - ¿Qué requiere intervención?
   - ¿Estamos mejorando?
3. Cada uno de los 18 indicadores de los seis pilares incluye un control desplegable **¿Qué debe verificarse?** con regla específica de datos y auditoría.
4. La interfaz reconoce expresamente que **sin datos no significa 0**, y que un porcentaje sin denominador tiene resultado **No aplica**, no cero.
5. Cerrar o ejecutar una acción no prueba por sí solo su eficacia. La verificación debe ser independiente, documentada y con revisión posterior cuando corresponda.
6. La sección advierte el estado real de las banderas de conexión central: con el guardado central o despliegue deshabilitados no se muestran números ni se permite inferir estadísticas.
7. Se actualizaron las referencias con marca de versión en `index.html` y la previsualización para evitar caché de archivos anteriores.

## Alcance real

Estos cambios son **funcionales dentro de la interfaz**: renombrar, abrir/cerrar secciones, recorrer indicadores, consultar sus condiciones de verificación y comprobar el aviso de disponibilidad. **No** son la instalación del motor de estadísticas ni la entrega automática de datos entre usuarios.

Los filtros de período, origen y área conservan el comportamiento anterior de presentación. El cálculo central sigue sin estar autorizado ni activado; por tanto **no** existen cifras consolidadas que puedan mostrarse como verificadas y la exportación ejecutiva permanece deshabilitada.

El acceso individual desde una cifra real a registros de origen requiere primero un servicio central de solo lectura con autorización de servidor; construir una navegación que solo aparente tener respaldo sería engañoso. Ese acceso queda pendiente, expresamente señalizado.

## Comprobación y seguridad

Archivo: `evidencias-v288/test-metodologia-v288.cjs`
CI: `.github/workflows/qa-v288-metodologia.yml`

Las pruebas automatizadas comprueban navegación de seis pilares, las 18 reglas específicas, títulos, estados de datos, control de acceso, menú real, sintaxis y regresiones del guardado. No sustituyen las pruebas de navegador autenticado y consultas reales.

**No se modificó**: v287, otras versiones protegidas, main, la aplicación publicada, políticas RLS, usuarios o Supabase de producción.

## Qué necesitamos de la revisión del usuario

1. Ingresar con una cuenta autorizada de Administrador General a la **aplicación completa v288** (no a la vista previa).
2. Confirmar que el menú lateral conserva «Pilares e Indicadores» y muestra los seis pilares.
3. Revisar dos ejemplos: «Compromisos vencidos» y «Eficacia de medidas», usando **¿Qué debe verificarse?**.
4. Confirmar que **Cómo se calcula y verifica** es comprensible y que no hacen falta nuevas casillas.
5. Para activar cifras y desglose en una etapa posterior, autorizar explícitamente el trabajo de preparación y pruebas en un entorno aislado, sin modificar producción hasta una nueva aprobación.

## Siguiente implementación autorizada

- Definir identificadores únicos y eventos auditados de informes/hallazgos/acciones.
- Preparar endpoint de consulta autorizada, con RLS por proyecto/área/tarjeta.
- Confirmar escrituras centrales antes de agregar indicadores al resumen.
- Habilitar consulta desde cada cifra hacia registros reales y exportación ejecutiva solo después de validación técnica y funcional.
