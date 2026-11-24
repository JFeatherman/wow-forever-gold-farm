const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
function setup(){
 const elements=new Map();
 function element(){return {value:'',textContent:'',hidden:false,style:{},children:[],listeners:{},append(...items){this.children.push(...items)},querySelectorAll(){return this.children.flatMap(x=>x.children||[]).filter(x=>x.type==='checkbox')},addEventListener(event,fn){(this.listeners[event]??=[]).push(fn)},fire(event){for(const fn of this.listeners[event]||[])fn()}}}
 for(const match of html.matchAll(/<[^>]+\bid="([^"]+)"[^>]*>/g)){const e=element();e.value=match[0].match(/\bvalue="([^"]*)"/)?.[1]||'';elements.set(match[1],e)}
 for(const id of ['gold-mode','salt-mode','moon-mode'])elements.get(id).value='ah';
 const context=vm.createContext({document:{getElementById:id=>elements.get(id),querySelector:selector=>elements.get(selector.slice(1)),createElement:element},localStorage:{getItem:()=>null,setItem(){}},Intl,Date,fetch:async()=>{throw Error('offline')}});
 new vm.Script(script).runInContext(context);
 return {elements,run:code=>vm.runInContext(code,context),set(id,value,event='input'){const e=elements.get(id);e.value=String(value);e.fire(event)},text:id=>elements.get(id).textContent};
}
test('inline JavaScript compiles and zero production does not require feed',()=>{
 const app=setup();assert.equal(app.text('moon-count'),'0');assert.equal(app.text('moon-month'),'0 gold');assert.equal(app.text('moon-per-unit'),'0 gold');assert.equal(app.text('salt-month'),'—');
 app.set('tailoring-alts',5);assert.equal(app.text('salt-count'),'0');assert.equal(app.text('salt-month'),'0 gold');assert.equal(app.text('moon-count'),'35');assert.equal(app.text('gold-combined'),'—');
});
test('allocation clamps immediately when total falls and on blur/change',()=>{
 const app=setup();app.set('tailoring-alts',4);app.set('alts',2);assert.equal(app.elements.get('tailoring-alts').value,'2');assert.equal(app.elements.get('tailoring-alts').max,'2');assert.equal(app.text('leatherworking-count'),'0');assert.equal(app.text('sa'),'0');assert.equal(app.text('mo'),'14');assert.equal(app.text('ar'),'30');assert.equal(app.text('es'),'180');
 app.set('tailoring-alts',-4,'blur');assert.equal(app.elements.get('tailoring-alts').value,'0');app.set('tailoring-alts',1.9,'change');assert.equal(app.elements.get('tailoring-alts').value,'1');
});
test('all-direct works offline and independent AH formulas and fees contribute',()=>{
 const app=setup();app.set('tailoring-alts',2);for(const id of ['gold-mode','salt-mode','moon-mode'])app.set(id,'direct','change');app.set('tip',2);app.set('salt-tip',3);app.set('moon-tip',4);assert.equal(app.text('gold-combined'),'296 gold');
 app.run('prices={12360:20,12359:2,12363:3,15409:10,8150:1,14342:30,14256:4}');
 app.set('moon-mode','ah','change');app.set('moon-fee',10);assert.equal(app.text('moon-per-unit'),'19 gold');assert.equal(app.text('gold-combined'),'506 gold');assert.equal(app.elements.get('salt-direct-fields').hidden,false);
 app.set('salt-mode','ah','change');app.set('salt-fee',20);assert.equal(app.text('salt-per-unit'),'7 gold');assert.equal(app.text('gold-combined'),'626 gold');assert.equal(app.elements.get('moon-fee').value,'10');assert.equal(app.elements.get('moon-tip').value,'4');
});
test('current real snapshot validates all seven IDs and rejects missing Mooncloth',()=>{
 const app=setup(),snapshot=JSON.parse(fs.readFileSync('prices.json','utf8'));app.run('validateSnapshot('+JSON.stringify(snapshot)+')');snapshot.items=snapshot.items.filter(item=>item.itemId!==14342);assert.throws(()=>app.run('validateSnapshot('+JSON.stringify(snapshot)+')'));
});
