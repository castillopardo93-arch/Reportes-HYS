> Actualización: el usuario autorizó conectar Supabase para pruebas generales. Se instalaron y verificaron los objetos aislados v239 y se activó config-v239.js. Ver CONEXION-SUPABASE-v239.md. El despliegue HTTPS de la app sigue sin publicar. Los estados anteriores de este documento describen la revisión inicial.

# Reportes HYS v239

Copia independiente de desarrollo basada en desarrollo/v238 (71d10f066d6b2d374cdce6254cd9124083b9d535). Revisar CAMBIOS-v239.md, PRUEBAS-v239.md y PENDIENTES-v239.md.

## Ejecutar revisión local

1. Ejecutar node preparar-qa.cjs.
2. Ejecutar node servidor-local.cjs.
3. Abrir http://127.0.0.1:8239/qa/index.html?qa=1&role=usuario. Roles ficticios: usuario, supervisor, administrador_area, administrador_global. readonly=1 reproduce consulta; failStorage=1 reproduce fallo IndexedDB.

QA no usa usuarios ni informes reales. Los controles de interrupción de red y conflicto afectan únicamente al cliente simulado.

La aplicación normal es index.html; config-v239.js mantiene las escrituras centrales v239 desactivadas hasta autorización. La consulta de autenticación, catálogos y apariencia usa los permisos existentes. El almacenamiento local es exclusivo de v239, usuario y módulo.

## Pruebas reproducibles

Instalar las dependencias fijadas con pnpm install --frozen-lockfile. Ejecutar node verificar-todo.cjs. PostgreSQL local usa @electric-sql/pglite; PDF real usa la misma versión de jsPDF que la app. No ejecutar SQL en Supabase real para correr estas pruebas.

El SQL bajo supabase es una propuesta no aplicada. No ejecutar en producción. El paquete no contiene respaldos personales, tokens privados, contraseñas ni informes reales. Los PDF de pruebas son sintéticos.

## Cambio de comportamiento deliberado

Finalizar conserva el informe en pantalla y su identidad. Nuevo informe conserva primero la copia anterior y abre un borrador con otro ID. El PDF corresponde a la instantánea visible; si se cambia durante su generación, se avisa y se solicita regenerarlo para archivar la versión nueva.

No se cambia el requisito de completar los siete campos de Inicio para generar PDF.
