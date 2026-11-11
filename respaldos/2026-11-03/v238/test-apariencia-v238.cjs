const assert=require('node:assert/strict'),C=require('./appearance-core-v238.js');let n=0;const test=(name,fn)=>{fn();n++;console.log('OK '+name)};
test('Tres estilos legibles',()=>{for(const p of Object.keys(C.PRESETS))assert.deepEqual(C.validate({...C.DEFAULT,colors:C.PRESETS[p]}).errors,[])});
test('Color malicioso no se incorpora',()=>assert.equal(C.normalize({colors:{primary:'red;display:none'}}).colors.primary,C.COLORS.primary));
test('HTML no se interpreta en el modelo',()=>assert.equal(C.normalize({text:{company:'<script>alert(1)</script>'}}).text.company,'<script>alert(1)</script>'));
test('Logo SVG y URL externa rechazados',()=>{assert.equal(C.normalize({logo:'data:image/svg+xml;base64,AA'}).logo,'');assert.equal(C.normalize({logo:'https://other.example/logo.png'}).logo,'')});
test('Icono arbitrario descartado',()=>assert.equal(C.normalize({icons:{APR:'<img>'}}).icons.APR,'shield'));
test('Propiedades desconocidas descartadas',()=>assert(!Object.hasOwn(C.normalize({css:'evil',colors:{unexpected:'#000000'}}),'css')));
test('Contraste insuficiente bloquea aplicar',()=>assert(C.validate({colors:{text:'#ffffff',surface:'#ffffff'}}).errors.length));
test('Tamaños y espaciado fuera de rango descartados',()=>{const c=C.normalize({fontSize:200,radius:200,spacing:'evil'});assert.equal(c.fontSize,13);assert.equal(c.radius,12);assert.equal(c.spacing,'normal')});
test('Texto de contraste automático para botones',()=>{assert.equal(C.foreground('#ffffff'),'#000000');assert.equal(C.foreground('#000000'),'#ffffff')});
test('Normalizar no altera el modelo original',()=>{const d=C.clone(C.DEFAULT);d.colors.header='#000000';assert.equal(C.DEFAULT.colors.header,'#123b63')});
console.log(n+' pruebas de apariencia aprobadas.');

