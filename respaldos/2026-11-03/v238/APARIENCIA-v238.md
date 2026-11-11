# Apariencia de la aplicación — v238

Acceso: iniciar sesión como Administrador Global y abrir «Apariencia de la aplicación» en la cinta lateral, debajo de Usuarios y Áreas y opciones.

## Uso
1. Elegir Azul corporativo, Claro o Alto contraste como punto de partida.
2. Personalizar colores de fondo, tarjetas, encabezado, menú lateral, botones, pestaña activa y secciones de actividades/hallazgos.
3. Seleccionar iconos de la galería para los módulos, el emblema, los menús y las secciones.
4. Ajustar título, empresa, nombres y descripciones de módulos. Los códigos APR/OTROS, permisos e informes no cambian.
5. Incorporar un logotipo PNG/JPG/WebP de hasta 5 MB; se adapta a 256 píxeles. No se admiten SVG ni direcciones externas.
6. Ajustar letra, separación y bordes.
7. «Probar cambios» muestra la apariencia solo en esta sesión, también al entrar en el segundo módulo. Volver a Apariencia permite salir de la prueba o publicarla.
8. «Aplicar para todos» guarda en Supabase después de la confirmación. Los usuarios activos consultan la configuración cada 30 segundos y al regresar a la ventana. Las sesiones que ingresen después la reciben al verificar su acceso.
9. «Restaurar apariencia anterior» recupera el último estilo compartido previo, conservando las versiones en el historial. «Cargar apariencia original» solo prepara una vista previa; hay que aplicar para compartirla.

La configuración inicial sigue siendo la original (revisión 0). No se publicó ningún estilo de demostración en la base real. La función está disponible para que el usuario la revise.

## Seguridad y datos
- Solo un perfil activo con rol administrador_global puede modificar la fila central. Usuarios y administradores de área fueron probados bajo RLS; la condición también excluye supervisores.
- El historial es inmutable desde el cliente; lo escribe un trigger transaccional con actor y fecha del servidor.
- Configuración validada por lista de campos permitidos: colores hexadecimales, iconos conocidos, rangos de tamaño y logotipo raster. No acepta código CSS/HTML ejecutable ni SVG. Los textos se insertan con textContent.
- Un control de revisión evita sobrescribir silenciosamente ajustes publicados desde otra sesión.
- Solo usuarios autenticados, activos y autorizados a un módulo pueden leer la apariencia; el acceso anónimo no puede leer la tabla ni modificarla.
- El título y la identidad configurados se muestran dentro de la app después de verificar sesión. La pantalla inicial sin sesión conserva la identidad base.
- La apariencia de pantalla usa estilos limitados a screen; el motor PDF y los formularios se conservan.
- Respaldo previo de código: Reportes-HYS-v238-antes-apariencia.zip, separado del sitio. Los respaldos con datos de usuarios no se publican.

## Verificación
- 10 pruebas de validación y seguridad del modelo: estilos legibles, colores e iconos inválidos, rechazo de SVG/URLs, tamaños, propiedades no permitidas, contraste y aislamiento de objetos.
- 38 pruebas de acceso, 20 de administración y 9 de Inicio para PDF aprobadas, además de integridad y flujos PDF de ambos módulos.
- Base real, transacción revertida: publicación global, lectura de usuario, rechazo de escritura a usuario y administrador de área, historial inmutable, restauración, conflicto de revisión y rechazo de CSS/SVG.
- Revisión de seguridad de Supabase sin hallazgos nuevos para las tablas de apariencia. Persisten avisos previos ajenos a este cambio.
- Navegador local simulado: acceso global al panel, invisibilidad para usuario y supervisor, previsualización de estilo e icono, publicación simulada, restauración simulada y transmisión de la prueba al segundo módulo.
- Datos al terminar: apariencia revisión 0, un registro de historial original, 7 perfiles, 8 permisos y 2 informes conservados. No se cambiaron usuarios ni informes.
- 83 archivos de v236/v237 protegidos conservan sus hashes.

## Fuentes de implementación
Se revisaron las guías oficiales de [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) y [triggers](https://supabase.com/docs/guides/database/postgres/triggers), además del índice de cambios de Supabase. Los ajustes usan tablas independientes y funciones privadas con search_path fijo.

