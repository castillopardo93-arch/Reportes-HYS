# v242 — Instalación y publicación independiente

Fecha: 2026-11-05. URL: https://reportes-hys-v242-revision.freshfennel.chatgpt.site/

## Respaldo y conservación
- Respaldo privado actualizado y restaurado localmente: 28 tablas públicas, 27 de Auth, 7 usuarios, 1 informe v241 conservado. Restauración de alcance de aplicación; excluye Vault administrado y adapta el otorgante de roles en la copia local.
- Comparación de las 28 tablas existentes: cantidades y huellas de contenido sin cambios. Metadatos protegidos sin cambios. No se modificaron perfiles reales ni informes existentes.
- v241 y las versiones protegidas permanecen intactas. No se modificó main ni la aplicación oficial.

## Instalación autorizada
- Migración hys_v242_correcciones_aisladas: 13 tablas independientes con RLS. Ninguna RPC hys242 accesible a anon. Reserva de invitaciones y registro de resultados exclusivos del servicio.
- SQL atómico SHA256: a76ed0443e95eda8bf4a5c9b2593cb636739df79a04c8059ae6bdf9a0a91d7ad.
- Endpoint admin-users-v242 ACTIVE, versión 3, SHA256 59b42274344a5690e23803b073977c941a397e356c3af4dd1d12b12b67629c76. Autenticación validada dentro del manejador.
- Usuario confirmó que agregó la URL de retorno v242 a Supabase. Se habilitó el control de invitación; no se enviaron correos ni crearon cuentas reales durante las pruebas.
- Frontend habilitado para Supabase v242. Los informes v241 y anteriores permanecen en sus versiones; no hubo migración automática.

## Publicación y evidencia
- Sitio independiente público: appgprj_6aec653e475c81919858fd22548befd3.
- Fuente publicada: 8ac535c04c566361fe3c2b368492e5b1f477e0b0.
- Despliegue appgdep_6aec6ab3fd3881919458c7ab6fc9090d: succeeded.
- Navegador abrió la URL HTTPS y mostró acceso v242, campos correo/contraseña, botón Ingresar y recuperación. Conserva autenticación propia y permisos por cuenta.
- Etapa previa: 105 grupos locales aprobados. Esta etapa: 14 grupos del endpoint aprobados, incluyendo el nuevo control de URL, para 106 grupos únicos en el conjunto actual. Ver registro de correcciones para detalle.
- Comprobaciones SQL remotas: permisos General/Usuario, RLS, accesos de RPC y conservación de datos. Sin alteraciones de usuarios reales.

## Pendientes y límites
- Falta prueba de extremo a extremo con cuentas de prueba de los cuatro roles, correo real de invitación/recuperación y navegación autenticada desde móvil. Las pruebas locales de roles no sustituyen esa validación.
- No se considera aprobación funcional final del usuario. No se publicó sobre la aplicación oficial.

## Reversión
Volver al enlace anterior de v241 y deshabilitar la conexión v242 en una nueva entrega si fuera necesario. Conservar tablas, datos y respaldos; no ejecutar DROP ni eliminar usuarios para revertir. No tocar versiones protegidas.
