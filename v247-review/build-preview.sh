#!/bin/sh
# C10 — Artefactos necesarios, sin publicar código administrativo ni credenciales.
set -eu
for name in \
  config-v242.js \
  storage-v242.js \
  risk-catalog-v243.js \
  assignees-v243.js \
  commitment-v243.js \
  finding-detail-v243.js \
  corrections-v243.js \
  actions-v243.js \
  reassignment-v243.js \
  audit-v243.js \
  activity-workflow-v244.js \
  people-areas-v244.js \
  inbox-v245.js \
  pending-detail-v246.js \
  sync-core-v242.js \
  appearance-core-v242.js \
  appearance-v242.js \
  v242.css \
  appearance-v242.css \
  mobile-v242.css \
  risk-selector-v243.css \
  assignee-selector-v243.css \
  commitment-v243.css \
  finding-detail-v243.css \
  corrections-v243.css \
  actions-v243.css \
  reassignment-v243.css \
  audit-v243.css \
  activity-workflow-v244.css \
  people-areas-v244.css \
  inbox-v245.css \
  pending-detail-v246.css
do
  cp "v246/$name" "v246-review/$name"
done
printf '%s\n' 'Revisión HYS: recursos aislados copiados sin Supabase.'
