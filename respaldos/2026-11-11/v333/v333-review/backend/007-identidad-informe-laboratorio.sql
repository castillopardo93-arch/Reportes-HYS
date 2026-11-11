-- La descarga en el historial utiliza el ID del informe, incluso para cuentas de consulta.
create unique index borradores_id_unico on hys318_lab.borradores (id);
