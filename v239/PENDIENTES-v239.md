# Pendientes v239

- Publicación del entorno HTTPS de revisión: requiere autorización expresa según la solicitud del usuario.
- Creación de objetos Supabase v239 y activación central: pendiente del entorno de desarrollo autorizado. No hay migraciones aplicadas en producción.
- Integración HTTPS con Supabase v239: no probada todavía en un entorno remoto; sí se comprobaron código, interfaz simulada y reglas PostgreSQL locales.
- Catálogos personalizados y datos históricos: no se migraron. Copiar solo después de respaldo y decisión de alcance.
- Reapertura completamente sin conexión: los borradores se conservan; el perfil puede necesitar conexión para verificarse.
- Muchas fotografías/PDF grandes: revisar límites de red y capacidad en el entorno remoto. Se mantiene JSON con adjuntos y PDF por compatibilidad con el diseño previo; el listado ya no los descarga en bloque.
- No se aprueba ni se publica v239 mediante este registro.
