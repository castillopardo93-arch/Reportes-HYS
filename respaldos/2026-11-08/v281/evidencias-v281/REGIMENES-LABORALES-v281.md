# Reportes HYS — v281: Turnos habituales como régimen laboral independiente

Fecha: 2026-11-08  
Rama: `desarrollo/v281-regimen-laboral`  
Base aislada: `desarrollo/v280-pais-libre`  
Estado: desarrollo real, no publicado.

## Corrección del requerimiento

El usuario aclaró que debía **reutilizarse la interfaz de «Áreas y opciones», no los valores ni el almacenamiento del turno del informe diario**.

Se diferencian dos conceptos:

- **Turno del informe diario:** Día/Propio, Noche/Propio, Día/Reemplazo y Noche/Reemplazo; su catálogo `listas_v242.shift` permanece intacto.
- **Turno habitual / régimen laboral del trabajador:** patrón de trabajo-descanso, por ejemplo 5x2, 4x3, 10x5 y 7x7; se conecta exclusivamente a `regimenes_laborales_v281`.

## Implementado en la versión de desarrollo

- Sección nueva **Áreas y opciones → Turnos laborales**, con la misma apariencia de gestión que las opciones existentes.
- Al entrar en Turnos laborales se oculta el selector APR/OTROS, ya que el régimen laboral no pertenece a un módulo específico.
- Opciones administrativas: **Agregar**, **Editar**, **Eliminar de las opciones (conservar historial)** y **Restaurar**.
- Las altas y modificaciones solicitan motivo (mínimo 10 caracteres), confirmación y rol de Administrador general, y usan `hys281_guardar_regimen` cuando se instale.
- Consulta separada mediante `regimenes_laborales_v281`; nunca lee `listas_v242.shift` para la ficha laboral.
- El campo de ficha se denomina **Turno habitual (régimen laboral)** y usa los códigos activos del catálogo.
- Eliminación no destructiva: desactiva y oculta el régimen del selector, pero conserva su registro e historial para no modificar fichas históricas.
- Los cuatro patrones iniciales se **crearán al aprobar e instalar** el script de integración; no son datos simulados en la interfaz.
- La libre edición del país del documento, incorporada en v280, se conserva.

## Backend independiente preparado, no desplegado

Script: `propuestas-backend-v281/FICHA-Y-REGIMENES-LABORALES-v281.sql`.

Incluye las modificaciones de fichas propuestas anteriormente y crea específicamente `regimenes_laborales_v281`, con RLS, lectura autenticada, cuatro registros iniciales, control de administrador, revisión de concurrencia y auditoría en `eventos_v242`. La comprobación de turno de ficha deja de apuntar a `listas_v242.shift`.

El script **no fue ejecutado**, porque se conservaron las restricciones de no modificar Supabase de producción sin autorización explícita. Por tanto, **agregar, editar, eliminar/restaurar regímenes y guardar la ficha siguen bloqueados en la aplicación actual**, con aviso visible si falta el backend. No se presentan como acciones completadas.

## Verificaciones

- Sintaxis de los cuatro scripts principales y 48 bloques JS embebidos: sin errores.
- Nueve pruebas de lógica de lectura y validación con cliente aislado: 9/9 correctas.
- Verificada separación entre catálogo del informe y del régimen laboral.
- No se hicieron pruebas en navegador real ni operaciones de escritura autenticada.
- No se modificaron Supabase, `main`, app oficial ni las versiones protegidas.

## Pendientes antes de considerar operativa esta función

1. Revisión y autorización explícita del script de backend v281 para instalar en un entorno autorizado.
2. Verificar RLS, permisos, alta, edición, desactivación/restauración y auditoría con una cuenta de pruebas real.
3. Verificar la persistencia de la ficha laboral y los regímenes tras cerrar sesión y volver a entrar.
4. Revisar presentación visual en PC y móvil.
