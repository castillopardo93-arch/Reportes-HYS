/* Etiquetas y cálculo de cambios; nunca concede permisos por abrir una pantalla. */
(function(root){'use strict';const modules=['APR','OTROS'];
const clone=v=>JSON.parse(JSON.stringify(v));
function label(m){return root.HysAppearance242?.moduleLabel(m)||({APR:'Prevencionista de riesgos',OTROS:'Supervisores, capataces y otros'}[m])||'Tarjeta';}
function stable(v){if(Array.isArray(v))return JSON.stringify([...v].sort());if(v&&typeof v==='object')return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+stable(v[k])).join(',')+'}';return JSON.stringify(v)}
function normalizedScope(v){return {areas_ids:[...new Set(v?.areas_ids||[])].sort(),facultades:Object.fromEntries(Object.entries(v?.facultades||{}).filter(([k,on])=>on===true).sort(([a],[b])=>a.localeCompare(b)))}}
function plan(account,draftAccess,originalFac,draftFac,canDelegate){
 const revoke=[],grant=[];if(canDelegate&&account.rol==='administrador_area')for(const m of modules){const old=normalizedScope(originalFac[m]),next=normalizedScope(draftFac[m]);if(!originalFac[m]&&!Object.keys(next.facultades).length)continue;if(stable(old)===stable(next))continue;const step={kind:'faculties',module:m,revision:originalFac[m]?.revision||0,scope:next};(Object.keys(next.facultades).length?grant:revoke).push(step)}
 const steps=[...revoke];if(stable(account.ambitos||{})!==stable(draftAccess))steps.push({kind:'access',revision:account.revision||0,datos:{nombre:account.nombre,rol:account.rol,activo:account.activo,ambitos:clone(draftAccess)}});return [...steps,...grant];
}
const canAssignArea=(actor,m,id)=>actor?.profile?.activo===true&&(actor.profile.rol==='administrador_global'||actor.profile.rol==='administrador_area'&&actor.modules?.includes(m)&&(actor.facultades||[]).some(f=>f.modulo===m&&f.facultades?.users===true&&Array.isArray(f.areas_ids)&&f.areas_ids.includes(id)));
const canGrantEdit=(actor,m)=>actor?.profile?.activo===true&&(actor.profile.rol==='administrador_global'||actor.modules?.includes(m)&&actor.permissions?.some(p=>p.modulo===m&&p.puede_ver===true&&p.puede_editar===true));
const api={modules,clone,label,stable,normalizedScope,plan,canAssignArea,canGrantEdit};if(typeof module==='object'&&module.exports)module.exports=api;else root.Hys259Access=api;
})(typeof window==='object'?window:globalThis);
