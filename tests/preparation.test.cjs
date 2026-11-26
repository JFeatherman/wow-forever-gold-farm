const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
const realSnapshot=JSON.parse(fs.readFileSync('prices.json','utf8'));
// Small DOM adapter for deterministic event/persistence checks. Native layout and
// browser number-input sanitization remain a separate browser acceptance check.
function setup(storage=new Map()){
 const elements=new Map();let focused=null;
 function element(tag='div'){
  const e={tagName:tag.toUpperCase(),value:'',textContent:'',hidden:false,style:{},children:[],listeners:{},attributes:{},validity:{badInput:false},
   append(...children){this.children.push(...children)},replaceChildren(...children){this.children=[...children]},
   querySelectorAll(){return this.children.flatMap(x=>[x,...x.querySelectorAll()]).filter(x=>x.type==='checkbox')},
   addEventListener(type,fn){(this.listeners[type]??=[]).push(fn)},
   fire(type,event={}){for(const fn of this.listeners[type]||[])fn(event)},
   setAttribute(key,value){this.attributes[key]=String(value)},getAttribute(key){return this.attributes[key]},
   focus(){focused=this.id}};
  Object.defineProperty(e,'id',{get(){return this._id},set(value){this._id=value;elements.set(value,this)}});
  return e;
 }
 for(const match of html.matchAll(/<([\w-]+)\b[^>]*\bid="([^"]+)"[^>]*>/g)){
  const e=element(match[1]);e.id=match[2];e.value=match[0].match(/\bvalue="([^"]*)"/)?.[1]||'';e.hidden=/\bhidden(?:\s|>)/.test(match[0]);
  for(const [,key,value] of match[0].matchAll(/([\w-]+)="([^"]*)"/g))e.setAttribute(key,value);
 }
 for(const [id,value] of Object.entries({'gold-mode':'ah','salt-mode':'ah','moon-mode':'ah','prep-target':'production','prep-route':'oil'}))elements.get(id).value=value;
 const context=vm.createContext({document:{getElementById:id=>elements.get(id),querySelector:s=>elements.get(s.slice(1)),createElement:element},localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)},Intl,Date,fetch:async()=>{throw Error('offline')}});
 for(const script of scripts)new vm.Script(script).runInContext(context);
 return {elements,storage,run:code=>vm.runInContext(code,context),json:code=>JSON.parse(vm.runInContext('JSON.stringify('+code+')',context)),set(id,value,type='change'){const e=elements.get(id);e.value=String(value);e.fire(type)},text:id=>elements.get(id).textContent,focus:()=>focused,load(snapshot=realSnapshot){vm.runInContext('receivePreparationPrices('+JSON.stringify(snapshot)+')',context)}};
}
const row=(plan,id)=>plan.rows.find(row=>row.id===id);
test('accessible tabs keep Goldfarm default, preserve old DOM, support arrows/Home/End',()=>{
 const app=setup();assert.equal(app.elements.get('goldfarm-panel').hidden,false);assert.equal(app.elements.get('prepare-panel').hidden,true);
 assert.equal(app.elements.get('goldfarm-tab').getAttribute('aria-selected'),'true');assert.equal(app.elements.get('site-tabs').hidden,false);
 for(const id of ['checks','alts','ar','salt-month','moon-month','gold-combined'])assert.ok(app.elements.has(id));
 let prevented=false;app.elements.get('goldfarm-tab').fire('keydown',{key:'ArrowRight',preventDefault(){prevented=true}});
 assert.ok(prevented);assert.equal(app.focus(),'prepare-tab');assert.equal(app.elements.get('goldfarm-panel').hidden,true);assert.equal(app.elements.get('prepare-tab').tabIndex,0);
 for(const [id,key,expected] of [['prepare-tab','Home','goldfarm-tab'],['goldfarm-tab','End','prepare-tab'],['prepare-tab','ArrowLeft','goldfarm-tab']]){
  app.elements.get(id).fire('keydown',{key,preventDefault(){}});assert.equal(app.focus(),expected);
 }
 app.elements.get('prepare-tab').fire('click');assert.equal(app.elements.get('prepare-panel').hidden,false);
 // JS enhances visibility, so a JS failure does not hide the old page or new source text.
 assert.match(html,/<div id="goldfarm-panel"[^>]*tabindex="0">/);assert.match(html,/<div id="prepare-panel"[^>]*tabindex="0">/);
});
test('exact production end targets, bounded final batches and dependency algebra',()=>{
 const app=setup(),routes=app.json('preparationRoutes()'),plan=app.json('shoppingPlan([...preparationRoutes().alchemy,...preparationRoutes().leather])');
 assert.equal(routes.alchemy.at(-1).to,275);assert.equal(routes.leather.at(-1).to,250);
 assert.equal(routes.alchemy.at(-1).count,10);assert.equal(routes.leather.at(-1).count,15);
 assert.deepEqual(routes.leather.at(-1).materials,{'8170':8,'2325':1,'14341':1});
 assert.equal(row(plan,8170).base,120);assert.equal(row(plan,2325).base,15);assert.equal(row(plan,14341).base,15);
 assert.equal(row(plan,13422).base,47);assert.equal(row(plan,8838).base,10);assert.equal(row(plan,8925).base,35);assert.equal(row(plan,3372).base,160);
 assert.equal(plan.stock[13423],74);assert.equal(plan.stock[6370],10);assert.equal(plan.stock[9149],1);
 for(const id of [13423,6370,4231,4233,4236,4246,9149])assert.equal(row(plan,id),undefined,'must not buy own intermediate '+id);
 assert.equal(row(plan,2318).base,247);assert.equal(row(plan,4234).base,292);assert.equal(row(plan,4304).base,614);assert.equal(row(plan,4289).base,105);
 assert.equal(plan.stock[4246],2);assert.equal(row(plan,3575).base,4);assert.equal(row(plan,9262).base,1);assert.equal(row(plan,8831).base,4);assert.equal(row(plan,4625).base,4);
});
test('optional full blocks preserve source totals and selected route dependencies',()=>{
 const app=setup(),oil=app.json("preparationRoutes('300','oil')"),mana=app.json("preparationRoutes('300','mana')");
 assert.equal(oil.alchemy.at(-1).to,300);assert.equal(oil.leather.at(-1).to,300);
 const oilPlan=app.json("shoppingPlan([...preparationRoutes('300','oil').alchemy,...preparationRoutes('300','oil').leather])");
 assert.equal(row(oilPlan,8170).base,974);assert.equal(row(oilPlan,14047).base,490);assert.equal(row(oilPlan,14341).base,85);assert.equal(row(oilPlan,8925).base,69);assert.equal(row(oilPlan,8838).base,44);assert.equal(oilPlan.stock[13423],6);
 assert.equal(oil.alchemy.filter(s=>s.spell===17554).reduce((n,s)=>n+s.count,0),44);
 assert.equal(oil.leather.filter(s=>s.spell===19049).reduce((n,s)=>n+s.count,0),36);
 const manaPlan=app.json("shoppingPlan(preparationRoutes('300','mana').alchemy)");
 assert.equal(row(manaPlan,13422),undefined);assert.equal(manaPlan.stock[13423],undefined);
 assert.equal(row(manaPlan,8839).base,146);assert.equal(row(manaPlan,3358).base,36);assert.equal(row(manaPlan,8838).base,110);assert.equal(row(manaPlan,8925).base,91);
 assert.equal(mana.alchemy.at(-1).count,55);
 assert.equal(app.json("preparationRoutes('production','mana').alchemy").at(-1).spell,17554,'production always uses clipped oil baseline');
});
test('recipe prerequisites and KEEP instructions survive data rendering',()=>{
 const app=setup(),steps=app.json('[...ALCHEMY_BASE,...OIL_BLOCK,...MANA_BLOCK,...LEATHER_BASE,...LEATHER_EXTRA]');
 for(const step of steps){assert.ok(step.spell);assert.ok(step.count>0);assert.ok(Object.keys(step.materials).length)}
 assert.match(steps.find(s=>s.spell===10548).access,/Artisan.*225.*Hahrana.*Drakk/);
 assert.match(steps.find(s=>s.spell===19049).access,/bind on pickup.*Werg.*Leonard/);
 assert.match(steps.find(s=>s.spell===7259).access,/Bind on pickup.*Pestlezugg/);
 assert.match(steps.find(s=>s.spell===17554).access,/Superior Defense.*13478.*265/);
 assert.match(steps.find(s=>s.spell===17553).access,/13477.*260.*Algernon.*Ulthir/);
 assert.match(steps.find(s=>s.spell===19082).access,/bind on pickup.*Jase/);
 assert.match(html,/geen Engineering|leert geen Engineering/);assert.match(html,/Nat Pagle.*Angler Extreme/);
});
test('buffer rounds per alt after intermediates, multi-alt math independent of farm count',()=>{
 const app=setup(),plan=app.json('shoppingPlan(preparationRoutes().alchemy,3,10)');
 assert.deepEqual(row(plan,13422),{id:13422,base:47,reserve:5,perAlt:52,batch:156});assert.equal(row(plan,13423),undefined);assert.equal(plan.stock[13423],74);
 app.set('prep-alts',3);app.set('prep-buffer',10);assert.equal(app.elements.get('alts').value,'5');assert.equal(app.json('currentPreparation().plan').rows.find(r=>r.id===8170).batch,396);
});
test('actual snapshot, optional missing/invalid data, partial costs and complete price coverage',()=>{
 const app=setup();assert.match(app.text('prep-batch'),/Onbekend/);app.load();assert.ok(app.text('prep-price-status').includes(realSnapshot.items[0].updatedAt));assert.doesNotMatch(app.text('prep-batch'),/Onbekend/);
 assert.ok(app.json('currentPreparation().plan').rows.every(r=>app.elements.get('prep-price-'+r.id).placeholder!=='Onbekend'));
 const partial=structuredClone(realSnapshot);partial.items=partial.items.filter(item=>item.itemId!==765);app.load(partial);assert.match(app.text('prep-batch'),/Onbekend.*bekend deel/);assert.equal(app.elements.get('prep-price-765').placeholder,'Onbekend');
 app.run('validateSnapshot('+JSON.stringify(partial)+')'); // Original seven remain sufficient.
 for(const value of [-1,'oops',null]){const bad=structuredClone(realSnapshot);bad.items.find(i=>i.itemId===765).marketValue=value;app.load(bad);assert.equal(app.run('prepPrice(765)'),null)}
 app.run('receivePreparationPrices({...'+JSON.stringify(realSnapshot)+',source:"untrusted"})');assert.equal(app.run('prepPrice(765)'),null);
});
test('price override zero, invalid input, persistence, local scope, blank and reset',()=>{
 const storage=new Map(),app=setup(storage);app.load();const source=app.run('prepPrice(765)');assert.ok(source>0);
 app.set('prep-price-765',0,'input');assert.equal(app.run('prepPrice(765)'),0);assert.equal(JSON.parse(storage.get('forever-preparation-v1')).overrides[765],0);
 for(const bad of ['NaN','-1','Infinity','1e999','oops']){app.set('prep-price-765',bad,'input');assert.equal(app.run('prepPrice(765)'),0);assert.equal(app.elements.get('prep-price-765').getAttribute('aria-invalid'),'true')}
 const restored=setup(storage);restored.load();assert.equal(restored.run('prepPrice(765)'),0);assert.equal(restored.elements.get('prep-price-765').value,'0');
 restored.set('prep-price-765','','input');assert.equal(restored.run('prepPrice(765)'),source);
 app.set('prep-alts',4);app.set('prep-target','300');app.set('prep-route','mana');const saved=setup(storage);assert.equal(saved.elements.get('prep-alts').value,'4');assert.equal(saved.elements.get('prep-target').value,'300');assert.equal(saved.elements.get('prep-route').value,'mana');
 app.elements.get('prep-reset-prices').fire('click');assert.equal(app.run('prepPrice(765)'),source);assert.deepEqual(app.json('prepOverrides'),{});assert.equal(app.elements.get('prep-price-765').value,'');assert.equal(app.elements.get('prep-alts').value,'4');assert.equal(JSON.parse(storage.get('forever-preparation-v1')).overrides[765],undefined);
 const corrupt=setup(new Map([['forever-preparation-v1','not json']]));assert.equal(corrupt.elements.get('prep-alts').value,'1');
});
test('settings input followed by blur/change preserves the current price field',()=>{
 const app=setup();app.load();app.set('prep-alts',5,'input');
 const priceField=app.elements.get('prep-price-765');
 app.set('prep-alts',5,'change');
 assert.equal(app.elements.get('prep-price-765'),priceField,'duplicate change must not detach the next input');
 app.set('prep-price-765',0,'input');assert.equal(app.run('prepPrice(765)'),0);
});
test('invalid settings stay safe, manual allowances are explicit batch adjustments',()=>{
 const app=setup();app.load();const base=app.run('preparationCost(currentPreparation().plan.rows).known');
 app.set('prep-alts',2);app.set('prep-allowance',5);app.set('prep-recovery',1);assert.equal(app.text('prep-adjusted'),app.run('prepMoney('+base+'*2+8)'));
 for(const bad of ['NaN','-1','Infinity','0','1.5','51']){app.set('prep-alts',bad);assert.equal(app.json('currentPreparation().settings').alts,1);assert.equal(app.elements.get('prep-alts').getAttribute('aria-invalid'),'true');assert.doesNotMatch(app.text('prep-batch'),/NaN|Infinity/)}
 app.set('prep-buffer','-1');assert.equal(app.json('currentPreparation().settings').buffer,0);
});
