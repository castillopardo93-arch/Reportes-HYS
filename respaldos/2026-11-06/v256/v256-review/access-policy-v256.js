/* Visibilidad de herramientas; la autorización definitiva permanece en el servidor. */
(function(root){'use strict';
 const active=a=>a?.profile?.activo===true;
 function can(a,key,module){if(!active(a))return false;if(a.profile.rol==='administrador_global')return true;if(a.profile.rol!=='administrador_area')return false;return (a.facultades||[]).some(f=>(!module||f.modulo===module)&&['APR','OTROS'].includes(f.modulo)&&a.modules?.includes(f.modulo)&&Array.isArray(f.areas_ids)&&f.areas_ids.length>0&&f.facultades?.[key]===true)}
 const users=a=>can(a,'users')||can(a,'activation');
 const areas=a=>can(a,'areas')||(active(a)&&a.profile.rol==='supervisor'&&(a.permissions||[]).some(p=>a.modules?.includes(p.modulo)&&p.puede_ver===true&&p.puede_editar===true));
 const api={can,users,areas};if(typeof module==='object'&&module.exports)module.exports=api;else root.Hys256Access=api;
})(typeof window==='object'?window:globalThis);
