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
- La selección se incorpora al campo narrativo con código y nombre; también se aplica al selector de códigos de los planes de acción.
- El fichero se lee temporalmente en memoria mediante JSZip 3.10.1 y no se sube a Supabase ni al repositorio.
- **Sin el libro original cargado por el usuario, solo se muestran los códigos**. Las descripciones exactas NO se han inventado ni publicado en GitHub.
- Validación automática: 153 pares de código y descripción en un Excel sintético; comprobación pendiente con la hoja Tabla real y cotejo de las categorías.
- Las pruebas de regresión v306 y el flujo v308 se ejecutaron en GitHub Actions con éxito.
