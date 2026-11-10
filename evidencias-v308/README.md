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
