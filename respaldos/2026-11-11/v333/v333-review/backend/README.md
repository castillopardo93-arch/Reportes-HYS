# Investigación de accidentes · Backend local v317

Para abrir y probar la interfaz, seguir **LEEME-INTERFAZ.md** en esta carpeta.

La copia usa PostgreSQL en disco mediante PGlite, un servidor HTTP de loopback y cuentas ficticias seleccionables. La interfaz avanzada conecta guardado, recuperación, evidencias, búsqueda de revisores, envío, devolución, aprobación y cierre. El backend reutiliza las funciones de permisos v242 incluidas como fixture de pruebas.

| RPC | Función |
|---|---|
| hys313_investigacion_aplicar | Guardar y transicionar el estado con revisión esperada. |
| hys313_investigacion_listar | Listar hasta 20 documentos visibles por página. |
| hys313_investigacion_leer | Leer documento e historial por cursor de versión. |
| hys313_investigacion_revisores | Buscar candidatos activos con facultad y área permitida. |
| hys317_evidencia | Subir, listar, leer y eliminar PNG, JPEG y PDF por expediente, documento y casilla. |

## Migraciones y reversión

Aplicar 001, 002 y 003 únicamente en la base de pruebas local. El servidor prepara una base nueva con datos ficticios. Si encuentra la base inicial con 001 y 002, incorpora 003.

Cada actualización del documento exige la versión esperada. El expediente se bloquea en la transacción para serializar cambios. La aprobación exige revisor asignado y facultad de aprobación. El cierre usa las claves existentes closeFlashReport y closeFinalReport. Un Final desactualizado se devuelve y se reconcilia antes del reenvío.

Las reversiones se ejecutan en orden 003, 002 y 001, tras exportar los datos que se deseen conservar. Están destinadas a bases desechables. La reversión 003 retira la RPC nueva y conserva las columnas adicionales compatibles. Las posteriores eliminan los registros y tablas de Investigación de esa base.

## Límites de la validación

La identidad se selecciona entre las cuentas ficticias del laboratorio. Falta la integración de autenticación operativa. PNG/JPEG/PDF se validan por tamaño y firma básica. La comprobación no sustituye decodificación completa ni análisis antimalware. Word y Excel siguen pendientes. El contrato de campos obligatorios permanece provisional hasta su validación por H&S.

Los datos del proyecto Supabase oficial están fuera del circuito local. Las notificaciones reales y los demás módulos de la aplicación requieren integración y aceptación independientes.
