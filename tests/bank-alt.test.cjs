const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync('bank-alt.html','utf8');
const script=html.match(/<script>\n([\s\S]*?)<\/script>/)[1];
const fixture=JSON.parse(fs.readFileSync('tests/fixtures/bank-sheet.json','utf8'));
const snapshot=JSON.parse(fs.readFileSync('prices.json','utf8'));
const captured=JSON.parse(html.match(/<script id="captured-prices" type="application\/json">([\s\S]*?)<\/script>/)[1]);
const context=vm.createContext({});vm.runInContext(script,context);const B=context.BankAlt;
const settings={fee:5,buffer:20,count:50,other:0};
const cells={D14:'Soul Dust',D15:'Vision Dust',D16:'Dream Dust',D17:'Illusion Dust',D18:'Greater Astral Essence',D19:'Greater Mystic Essence',D20:'Greater Nether Essence',D21:'Greater Eternal Essence',D22:'Large Glimmering Shard',D23:'Small Glowing Shard',D24:'Large Glowing Shard',D25:'Small Radiant Shard',D26:'Large Radiant Shard',D27:'Small Brilliant Shard',D28:'Large Brilliant Shard'};
const idFor=name=>Object.keys(B.ITEMS).find(id=>B.ITEMS[id]===name);
const fixturePrices=Object.fromEntries(Object.entries(fixture.pricesSilver).map(([name,p])=>[idFor(name),p/100]));
const priceFrom=prices=>id=>Object.hasOwn(prices,id)?prices[id]:null;
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-12,`${a} != ${b}`);
function oracle(row,pricesSilver=fixture.pricesSilver){const scope=Object.fromEntries(Object.entries(cells).map(([cell,name])=>[cell,pricesSilver[name]]));return vm.runInNewContext(row.formula,scope)}
test('real extracted XLSX: eight cached exact outputs, original formula parity in gold',()=>{
 assert.equal(fixture.rows.length,8);assert.match(fixture.exportSha256,/^[a-f0-9]{64}$/);
 fixture.rows.forEach((row,i)=>{near(oracle(row),row.expectedSilver);near(B.evaluate(i,priceFrom(fixturePrices),settings).net,row.expectedSilver/100);assert.equal(B.BRACKETS[i].ilvl.replace('–','-'),row.itemLevel);assert.equal(B.BRACKETS[i].required.replace('–','-'),row.requiredLevel)});
});
test('each of 15 material perturbations agrees with extracted cell formula in every bracket',()=>{
 for(const name of Object.keys(fixture.pricesSilver))for(let i=0;i<8;i++){
  const adjusted={...fixture.pricesSilver,[name]:fixture.pricesSilver[name]+100};
  const prices={...fixturePrices,[idFor(name)]:fixturePrices[idFor(name)]+1};
  near(B.evaluate(i,priceFrom(prices),settings).net,oracle(fixture.rows[i],adjusted)/100);
 }
 const base=B.evaluate(1,priceFrom(fixturePrices),settings).net;
 const changed=B.evaluate(1,priceFrom({...fixturePrices,11135:fixturePrices[11135]+1}),settings).net;
 near(changed-base,.33*.4*.95);assert.ok(Math.abs(changed-base-(1/3)*.4*.95)>0.0001);
});
test('units, fee, buffer, cost allocation, selected bracket and blank purchase',()=>{
 const parsed=B.validateSnapshot(snapshot);for(const item of snapshot.items.filter(i=>i.itemId in B.ITEMS))near(parsed.prices[item.itemId],item.marketValue/10000);
 const p=priceFrom({...fixturePrices,279985:2});const s={...settings,other:3};const ev=B.evaluate(7,p,s);
 near(ev.ceiling,ev.net*.8-2/50-3/50);near(ev.reserve,ev.net*.2);near(ev.gross,ev.net/.95);
 near(B.evaluate(7,p,{...s,fee:100}).net,0);near(B.evaluate(7,p,{...s,fee:0}).net,ev.gross);
 const blank=B.sessionEstimate(7,p,s,null);assert.equal(blank.capital,null);assert.equal(blank.profit,null);near(blank.raw,50*ev.gross);
 const session=B.sessionEstimate(7,p,s,1);near(session.profit,50*(ev.net-1)-5);near(session.capital,55);
 near(B.sessionEstimate(7,p,{...s,buffer:95},1).profit,session.profit);
 assert.notEqual(B.sessionEstimate(0,p,s,1).profit,session.profit);assert.ok(B.evaluate(0,p,{...s,other:100}).ceiling<0);
});
test('missing, zero, invalid prices and timestamps never become fictitious zero',()=>{
 for(const input of ['', ' ', '-1', 'NaN','Infinity','1e300',NaN,Infinity,null,undefined])assert.equal(B.number(input),null,String(input));
 for(const invalid of ['2026-02-30T01:00:00Z','2026-11-25T24:00:00Z','2026-11-25T01:00:00'])assert.equal(B.timestamp(invalid),false);
 assert.equal(B.number('0'),0);assert.equal(B.number('101',100),null);assert.equal(B.number('1.5',Infinity,true),null);
 assert.equal(B.priceOf(11083,{},{}),null);assert.equal(B.priceOf(11083,{11083:1},{11083:0}),0);
 assert.equal(B.priceOf(11083,{11083:1},{},new Set(['11083'])),null);
 const p=priceFrom({...fixturePrices,279985:0});near(B.evaluate(0,p,settings).ceiling,B.evaluate(0,p,settings).net*.8);
 const missing=priceFrom({...fixturePrices,11083:null});assert.equal(B.evaluate(0,missing,settings).net,null);
 for(const mutate of [s=>s.items.push(s.items[0]),s=>s.items[0].marketValue=Infinity,s=>s.items[0].marketValue=-1,s=>s.items[0].updatedAt='bad',s=>s.fetchedAt='2026-11-26',s=>s.sourceLastModified='bad']){
  const s=structuredClone(snapshot);mutate(s);assert.throws(()=>B.validateSnapshot(s));
 }
 const partial=structuredClone(snapshot);partial.items=partial.items.filter(i=>i.itemId!==11083);assert.equal(B.validateSnapshot(partial).prices[11083],undefined);
});
test('route ends at 140, keeps two tools, exact materials and bounded known choices',()=>{
 const p=id=>({10940:2,10938:3,11083:4}[id]??1),plan=B.routePlan(p);
 assert.equal(plan.steps.at(-1).to,140);assert.equal(plan.steps.at(-1).count,10);assert.equal(plan.steps.at(-1).spell,13501);
 assert.equal(plan.materials[247786],19);assert.equal(plan.materials[6217],1);assert.equal(plan.materials[6338],1);assert.equal(plan.materials[10940],180);assert.equal(plan.materials[10938],4);assert.equal(plan.materials[11083],10);assert.equal(plan.materials[1210],1);
 assert.deepEqual(Array.from(plan.steps.filter(s=>s.note.includes('KEEP')),s=>s.spell),[7421,7795]);
 const alternative=B.routePlan(p,'essence','dust');assert.equal(alternative.materials[10940],170);assert.equal(alternative.materials[10938],54);assert.equal(alternative.materials[11083],undefined);assert.equal(alternative.steps.at(-1).spell,7863);
 const unknown=B.routePlan(id=>id===10938?null:p(id));assert.equal(unknown.total,null);assert.equal(unknown.complete,false);
 assert.match(html,/140 voor een gekochte Salvager, 150 \+ eigen rod \+ blueprint/);assert.match(html,/Enchanting 300 en level 35 zijn hiervoor niet nodig/);assert.match(html,/gedeelde cooldown van 1 uur/);
});
// Native controls are stable objects: output rendering must not replace focused inputs.
function dom(storage=new Map(),online=null){
 const elements=new Map();let focused=null;const requests=[];
 function element(tag='div'){
  const e={tagName:tag.toUpperCase(),value:'',children:[],listeners:{},attributes:{},validity:{badInput:false},_text:'',
   append(...nodes){this.children.push(...nodes)},replaceChildren(...nodes){this.children=[...nodes];this._text=''},
   addEventListener(type,fn){(this.listeners[type]??=[]).push(fn)},fire(type){for(const fn of this.listeners[type]||[])fn()},
   setAttribute(k,v){this.attributes[k]=String(v)},focus(){focused=this},
   get textContent(){return this._text+this.children.map(x=>x.textContent).join('')},set textContent(v){this._text=String(v);this.children=[]}};
  Object.defineProperty(e,'id',{get(){return this._id},set(v){this._id=v;elements.set(v,this)}});return e;
 }
 for(const m of html.matchAll(/<([\w-]+)\b[^>]*\bid="([^"]+)"[^>]*>/g)){const e=element(m[1]);e.id=m[2];e.value=m[0].match(/\bvalue="([^"]*)"/)?.[1]||''}
 elements.get('captured-prices').textContent=JSON.stringify(captured);elements.get('early').value='auto';elements.get('late').value='auto';
 const c=vm.createContext({document:{getElementById:id=>elements.get(id),createElement:element,createTextNode:text=>({textContent:text})},localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,v)=>storage.set(key,v)},location:{protocol:online?'https:':'file:'},fetch:async(url)=>{requests.push(url);return {ok:true,json:async()=>online}},Date,Intl});
 vm.runInContext(script,c);
 return {elements,storage,requests,focused:()=>focused,text:id=>elements.get(id).textContent,set(id,value,event='input'){const e=elements.get(id);e.value=String(value);e.fire(event)}};
}
test('actual embedded fallback, localStorage zero/blank/invalid/reset and focus preservation',()=>{
 const app=dom();assert.match(app.text('price-status'),/OFFLINE FALLBACK/);assert.ok(app.text('price-status').includes(captured.items[0].updatedAt));
 assert.equal(captured.items.length,Object.keys(B.ITEMS).length);assert.ok(captured.items.length<snapshot.items.length);
 // The offline capture intentionally stays fixed when daily prices.json moves on.
 if(captured.sourceLastModified===snapshot.sourceLastModified)for(const item of captured.items)assert.deepEqual(item,snapshot.items.find(i=>i.itemId===item.itemId));
 assert.equal(B.validateSnapshot(captured).updatedAt,'2026-11-25T00:57:43Z');
 const input=app.elements.get('price-11083');input.focus();app.set('price-11083',0);assert.equal(app.focused(),input);assert.equal(app.elements.get('price-11083'),input);
 assert.equal(JSON.parse(app.storage.get(B.STORAGE))[11083],0);assert.equal(dom(app.storage).elements.get('price-11083').value,0);
 app.set('price-11083',-1);assert.equal(input.attributes['aria-invalid'],'true');assert.match(app.elements.get('brackets').children[0].children[2].textContent,/Onbekend/);
 app.set('price-11083','');assert.equal(input.attributes['aria-invalid'],'false');assert.equal(JSON.parse(app.storage.get(B.STORAGE))[11083],undefined);
 app.set('price-11083',0);app.elements.get('reset').fire('click');assert.equal(input.value,'');assert.deepEqual(JSON.parse(app.storage.get(B.STORAGE)),{});assert.equal(app.elements.get('price-11083'),input);
 assert.match(app.text('session'),/Benodigd kapitaal incl. sessiekosten: Onbekend/);app.set('buy',0);assert.doesNotMatch(app.text('session'),/Benodigd kapitaal incl. sessiekosten: Onbekend/);
 app.set('count',0);assert.equal(app.elements.get('count').attributes['aria-invalid'],'true');app.set('count',50);app.set('bracket',7,'change');assert.ok(app.text('session').includes('Ruwe verwachte materiaalwaarde'));
});
test('same-origin online snapshot takes precedence, missing stays unknown and reset uses newest source',async()=>{
 const online=structuredClone(snapshot);online.items=online.items.filter(i=>i.itemId!==11083);online.items.find(i=>i.itemId===279985).marketValue=0;
 const app=dom(new Map(),online);await new Promise(resolve=>setImmediate(resolve));
 assert.deepEqual(app.requests,['prices.json']);assert.match(app.text('price-status'),/Online prices.json/);assert.match(app.elements.get('brackets').children[0].children[2].textContent,/Onbekend/);
 app.set('price-11083',1);app.elements.get('reset').fire('click');assert.match(app.elements.get('brackets').children[0].children[2].textContent,/Onbekend/);
 assert.equal(app.elements.get('price-279985').value,'');
});
