# Verificación previa al respaldo manual

Fecha de consulta remota: 2026-11-04 23:30:11 UTC.

La captura del panel aportada por el usuario confirma que el plan gratuito no tiene respaldos programados. La conexión MCP está disponible para consultas, pero no ofrece una operación de exportación pg_dump ni acceso directo de PostgreSQL.

Inventario agregado, sin datos personales: 15 tablas públicas, 7 perfiles, 7 cuentas Auth, 0 buckets y 0 objetos Storage. Ninguna tabla v241 instalada. No se copiaron contraseñas, informes, cuentas ni fotografías a este repositorio.

No hay conexión PostgreSQL preparada en las variables habituales del entorno y no se detectaron pg_dump, psql, Supabase CLI ni Docker en PATH. No se buscaron contraseñas en otros archivos ni se restableció ninguna credencial.

## Estado

**No se generó ni se verificó un respaldo restaurable.** Inventarios, hashes y paquetes de código no sustituyen el respaldo de base/Auth. No se aplicó instalación v241, no se modificó producción y no se alteraron versiones protegidas.

## Requisito para continuar

Configurar conexión PostgreSQL desde Connect del proyecto, preferentemente Session pooler si no hay IPv6. Identificar host, puerto, usuario y base; introducir la contraseña existente únicamente en un mecanismo local privado, nunca en chat, GitHub o argumentos visibles. No restablecerla para esta tarea.

Con acceso disponible: preparar herramienta de exportación compatible, generar archivo privado con esquema/datos/Auth y dependencias, comprobar integridad y restauración en un entorno separado. Las fotografías incrustadas en informes deben quedar incluidas; Storage vacío solo acredita la ausencia de objetos allí. Verificar también configuración/funciones y dependencias del proyecto antes de declarar cobertura completa.

Solo después de acreditar restaurabilidad se ejecutará la instalación aditiva v241 autorizada. Sin eliminar datos como estrategia de reversión.

Referencia oficial: https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore

