const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createSessions}=require('./sesiones-informes-local.cjs');

test('Los tokens de informes vencen y cerrar una sesión no revoca otra cuenta',()=>{
 let clock=0;
 const sessions=createSessions(()=>clock);
 const owner=sessions.login({usuario:'elaborador',clave:'prueba-elaborador'});
 const reader=sessions.login({usuario:'consulta-apr',clave:'prueba-consulta'});
 const bearer=value=>'Bearer '+value.token;
 assert.equal(sessions.require(bearer(owner)).write,true);
 assert.equal(sessions.require(bearer(reader)).write,false);
 sessions.logout(bearer(reader));
 assert.throws(()=>sessions.require(bearer(reader)),{status:401});
 assert.equal(sessions.require(bearer(owner)).actor,owner.actor);
 clock=30*60*1000;
 assert.throws(()=>sessions.require(bearer(owner)),{status:401});
});
