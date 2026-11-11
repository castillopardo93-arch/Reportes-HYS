const {test}=require('node:test');
const assert=require('node:assert/strict');
const {filename}=require('../investigacion-pdf-v332.js');
test('El nombre abrevia un involucrado y conserva la inicial del segundo apellido',()=>{
 const base={fecha:'2026-11-11',codigo:'INV-0042',kind:'flash'};
 assert.equal(filename({...base,nombres:'Juan Luis Pérez Orrego'}),
  '2026-11-11_INV-0042_Juan Pérez O_Flash-Report.pdf');
 assert.equal(filename({...base,nombres:'Juan Pérez'}),
  '2026-11-11_INV-0042_Juan Pérez_Flash-Report.pdf');
 assert.throws(()=>filename({...base,fecha:'2026-02-30',nombres:'Juan Pérez'}),/fecha válida/);
 assert.throws(()=>filename({...base,nombres:' '}),/involucrado/);
 const many=Array.from({length:30},()=> 'Juan Luis Pérez Orrego').join('\n');
 const short=filename({...base,nombres:many,kind:'final'});
 assert.ok(Buffer.byteLength(short)<=200);
 assert.match(short,/-y-\d+-más_Final-Report\.pdf$/);
});
