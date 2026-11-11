/* Ejecuta el método real de caché con cambios controlados de sesión; sin navegador ni datos reales. */
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const html=fs.readFileSync(__dirname+'/index.html','utf8');
const method=html.match(/async cacheArchive\(entry\)\{([\s\S]*?)\},\s*updateCatalogOwner/)[1];
(async()=>{
 let session='usuario-A',release;const written=[];const read=()=>new Promise(ok=>release=ok);
 const open=async()=>{const captured=session;return {transaction(){const tx={objectStore:()=>({put:entry=>written.push({session:captured,entry})})};queueMicrotask(()=>tx.oncomplete?.());return tx},close(){}}};
 const ctx={readLocalArchivedReport241:read,openArchiveDB:open,ARCHIVE_DB_STORE:'pdfs',window:{HysFingerprint241:JSON.stringify},Promise};
 const fn=vm.runInNewContext('(async function(entry){'+method+'})',ctx);
 const operation=fn({id:'v241-sintetico-A',reportData:{owner:'A'}});session='usuario-B';release(null);await operation;
 assert.equal(written[0].session,'usuario-B');assert.equal(written[0].entry.reportData.owner,'A');console.log('CONFIRMADO: caché del usuario A se escribe en almacenamiento B si cambia la sesión durante lectura.');
 const edge=fs.readFileSync(__dirname+'/supabase/functions/admin-users-v241/index.ts','utf8');const redirect=edge.match(/const redirect=Deno.env.get\('HYS241_INVITE_REDIRECT'\)\|\|'([^']+)'/)[1];
 assert.equal(new URL(redirect).searchParams.get('recuperar'),null);assert.equal(new URL(redirect).searchParams.get('activar'),null);assert(html.includes('detectSessionInUrl:recoveryMode'));console.log('CONFIRMADO: retorno por defecto de invitación no activa detección de sesión ni creación de contraseña.');
})().catch(e=>{console.error(e);process.exitCode=1});
