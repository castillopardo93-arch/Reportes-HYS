# Reportes HYS — v308 (laboratorio de investigación)

Copia aislada desde v307, para probar funciones de investigación con datos exclusivamente ficticios.

## Funciones instaladas
- Acceso a Investigación de accidente para cualquier perfil autenticado y activo, aun si no posee facultades APR/OTROS. Las facultades de esos módulos no se cambian.
- Tres tarjetas: Flash Report, Final Report y Seguimiento Flash.
- Creación de múltiples Flash Report independientes, Guardar borrador y Enviar a revisión de prueba.
- Selección de revisores ficticios, devolución con observación obligatoria, corrección, secuencia de revisores, aprobación e historial.
- Final Report inicia anticipadamente con el mismo número SIM que Flash Report, precarga algunos antecedentes y no permite aprobación final antes de aprobar Flash.
- Seguimiento Flash indica autor, estado, persona que revisa y cambios entre revisiones.
- Laboratorio autónomo para recorrer el circuito sin usar cuentas reales: `v308-review/demo-v308.html`.

## Limitaciones de seguridad
- **Guardado solo en memoria:** se pierde al recargar el navegador. No introducir RUT ni accidentes o antecedentes reales.
- Los adjuntos no se conservan al reabrir un registro en el laboratorio.
- Los números SIM son temporales, no correlativos globales oficiales.
- Selección y aprobación de revisores reales, notificaciones y guardado central siguen bloqueados hasta disponer de backend, permisos y auditoría RLS autorizados.
- Sin cambios de tablas, buckets, funciones o datos de Supabase. Sin publicación ni cambios de main.
- Generación de PDF exactamente igual a Excel y conexión de listas originales pendientes.

## QA
La prueba DOM es `evidencias-v308/test-flujo-v308.cjs`; requiere `jsdom@26.1.0`. Aun con pruebas automáticas, se necesita revisión visual de los formularios en un navegador real.

## Corrección del análisis de causas en Final Report (misma v308)
- Se añadió carga directa de la hoja `Tabla` desde el Excel original HSS-RGT-007 Rev. 08 en la sección 9.
- Cada opción mantiene el código como identificador y muestra `código — nombre` cuando la descripción viene del libro.
- La selección se incorpora al campo narrativo del análisis de causas con código y nombre. La lista desplegable corresponde exclusivamente al punto 9; **el punto 10 no contiene desplegable**, y su columna CÓDIGOS se rellena libremente, como en el Excel original.
- El fichero se lee temporalmente en memoria mediante JSZip 3.10.1 y no se sube a Supabase ni al repositorio.
- **Sin el libro original cargado por el usuario, solo se muestran los códigos**. Las descripciones exactas NO se han inventado ni publicado en GitHub.
- Validación automática: 153 pares de código y descripción en un Excel sintético; comprobación pendiente con la hoja Tabla real y cotejo de las categorías.
- Las pruebas de regresión v306 y el flujo v308 se ejecutaron en GitHub Actions con éxito.

## Cambio v308 — desplegables automáticos de causas (10/11/2026)

- Se eliminó la carga manual de Excel desde la sección 9 de Final Report, tanto en la aplicación como en el laboratorio.
- Los códigos + nombres deben proceder de `causas-datos-v308.js`, un archivo estático generado una sola vez desde la hoja `Tabla` del XLSX maestro.
- Se incorpora el generador reproducible `evidencias-v308/extraer-causas-desde-excel.py`; la salida requiere 153 pares válidos y se rechazan listas parciales o contradictorias.
- **Bloqueador pendiente**: la copia registrada del HSS-RGT-007 en Library no entregó sus bytes para extracción, y no existe copia del XLSX en GitHub ni en Supabase Storage. Por eso el archivo de datos integrado está intencionalmente vacío; el sistema no inventa nombres ni muestra códigos huérfanos.
- Los desplegables quedan deshabilitados hasta incorporar la plantilla original, sin impedir la revisión de la interfaz y otros campos.
- No se requiere cargar Excel por cada usuario o reporte; queda pendiente la generación efectiva de 153 nombres desde el libro real y su revisión visual.
- En las pruebas automatizadas se inyecta un catálogo **sintético** de 153 descripciones para validar la interfaz. Los nombres de prueba no forman parte de la aplicación real.

## Ajuste puntual del punto 10 — Planes de acción (10/11/2026)
- Verificado en la hoja `Final Report` de la plantilla HSS-RGT-007 Rev. 08: en el punto 10 existen `CÓDIGOS` y `PLANES DE ACCION RECOMENDADOS`, sin lista desplegable en la columna CÓDIGOS.
- Se reemplazó el selector de `action_*_codigo` por un `input type="text"`; permanece la capacidad de añadir planes y los demás campos.
- Las listas de código y nombre permanecen solo en las cinco categorías del punto 9.
- Los test de flujo, catálogo y ubicación comprueban las dos secciones por separado. No se modificó Supabase/producción/main.
