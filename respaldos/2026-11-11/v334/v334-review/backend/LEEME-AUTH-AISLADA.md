# Validación de Supabase Auth aislada

El ejecutor necesita una instancia Supabase local en loopback con las RPC `hys242_consultar_informes` y `hys242_cargar_informe` y el esquema de acceso compatible. La base PGlite de Reportes HYS sirve para la regresión local y no suministra esas RPC ni Supabase Auth.

Prepara dos cuentas ficticias con inicio de sesión por contraseña y tres informes cerrados de un proyecto de prueba con un nombre único como `QA-v326`. El elaborador debe ser propietario de los tres informes y tener acceso a sus tarjetas y áreas. Guarda un PDF sintético en cada informe. La cuenta de consulta debe poder listar y descargar únicamente el informe APR del área permitida. Usa otro informe APR de un área distinta y un tercer informe OTROS. La cuenta de consulta no debe tener facultades globales.

Copia `config-auth-aislada.ejemplo.json` fuera del repositorio, rellena sus datos ficticios y ejecuta desde la carpeta que contiene `v326-review`:

```sh
node v334-review/backend/verificar-supabase-auth.cjs ruta-config.json --revocacion
```

En la pausa, revoca en esa instancia local la facultad o el área que permite a la cuenta de consulta acceder al informe. Mantén los permisos del elaborador. Pulsa Enter. El ejecutor usa el mismo token de la cuenta de consulta y comprueba que se bloquee la descarga y que el informe ya no aparezca en el listado. También verifica que el elaborador conserve acceso. Sin `--revocacion` se ejecutan solo las comprobaciones previas.

El ejecutor rechaza destinos que no sean loopback, credenciales administrativas y redirecciones. No se debe conectar un proxy o túnel local a producción. El ejecutor inicia sesiones de las cuentas ficticias, consulta las RPC de lectura y nunca imprime credenciales, tokens ni contenido de informes.

Documentación de referencia: [Desarrollo local de Supabase](https://supabase.com/docs/guides/local-development) y [Pruebas de autenticación](https://supabase.com/docs/guides/auth/testing-auth-flows).
