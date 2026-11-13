const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'Weather/Art/live-art-online.js'), 'utf8');
const clear = JSON.parse(fs.readFileSync(path.join(root, 'Weather/Art/clear-maple-pavilion-003.json'), 'utf8'));
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'Weather/Art/art-library.json'), 'utf8'));
const maskPath = path.join(root, clear.stageMaskAtlasPath);
const maskInfo = require('node:fs').statSync(maskPath);
assert.ok(maskInfo.size > 1000, 'The transparent five-stage mask atlas is packaged');
const calls = { fill: 0, stroke: 0, drawImage: 0 };
function ctx() { return { globalCompositeOperation:'source-over', setTransform(){}, clearRect(){}, fillRect(){}, save(){}, restore(){}, beginPath(){}, moveTo(){}, lineTo(){}, quadraticCurveTo(){}, closePath(){}, fill(){calls.fill++}, stroke(){calls.stroke++}, drawImage(){calls.drawImage++}, createLinearGradient(){return {addColorStop(){}}} }; }
const raf=[];
const doc={documentElement:{},hidden:false,querySelector(){return null},getElementById(){return null},addEventListener(){},removeEventListener(){},createElement(){return {width:0,height:0,isConnected:true,getContext(){return ctx()},style:{},dataset:{},setAttribute(){},getBoundingClientRect(){return {width:600,height:420}}}}};
class MutationObserver{observe(){}disconnect(){}}
const win={__liveEarthWeatherArtOnlineInstalled:false,__LIVE_EARTH_WEATHER_ART_TEST__:true,devicePixelRatio:1,addEventListener(){},removeEventListener(){},matchMedia(){return {matches:false}}};
const sandbox={window:win,document:doc,navigator:{onLine:false},MutationObserver,console,URL,AbortController,Image:function(){},createImageBitmap:async()=>({}),atob:global.atob,performance:{now:()=>0},requestAnimationFrame(fn){raf.push(fn);return raf.length},cancelAnimationFrame(){}};
vm.runInNewContext(source,sandbox,{timeout:5000});
const api=win.__LIVE_EARTH_WEATHER_ART_TEST_API__; assert.ok(api);
const prepared=api.prepareArtwork(clear);
assert.equal(prepared.rendererVersion,3);assert.equal(prepared.durationMs,30000);assert.equal(prepared.strokes.length,100);assert.ok(prepared.masterImagePath.endsWith('.jpg'));assert.ok(prepared.stageMaskAtlasPath.endsWith('.png'));
assert.deepEqual(clear.stages.map(x=>x.title),['Thick structural brushwork','Attached thin brushwork','Air, birds and little details','Leaves after everything else','Sun and final finish']);
assert.deepEqual(clear.stages.map(x=>x.strokeCount),[28,27,12,20,13]);
assert.equal(clear.strokes[0].stageId,'01');assert.equal(clear.strokes.at(-1).stageId,'05');assert.ok(clear.strokes.every((s,i)=>s.order===i+1));
const bad=JSON.parse(JSON.stringify(clear));bad.strokes[0].points[0][2]=1.4;assert.throws(()=>api.prepareArtwork(bad));
const wrong=JSON.parse(JSON.stringify(clear));wrong.durationMs=75000;assert.throws(()=>api.prepareArtwork(wrong),/30-second/);
const tooMany=JSON.parse(JSON.stringify(clear));tooMany.strokes.push({...tooMany.strokes.at(-1),order:101,id:'101-over-limit'});tooMany.strokeCount=101;assert.throws(()=>api.prepareArtwork(tooMany),/no more than 100/);
const wrongStage=JSON.parse(JSON.stringify(clear));wrongStage.strokes[99].stageId='04';assert.throws(()=>api.prepareArtwork(wrongStage),/stages must follow/);
// Version 1 remains supported for the existing Rain asset and historical artwork.
const pathBytes=Buffer.from([0,0,2,2,2,2]).toString('base64');
const legacy=api.prepareArtwork({schemaVersion:1,renderMode:'ordered-ink-wash-paths',id:'legacy-v1',title:'Legacy',palette:['#211d19'],durationMs:22000,paths:Array.from({length:20},()=>[0,pathBytes])});
assert.equal(legacy.rendererVersion,1);assert.equal(legacy.paths.length,20);
// Schema 2 remains supported for retained historical Clear 002 records.
const pressure=api.prepareArtwork({schemaVersion:2,renderMode:'ordered-pressure-strokes',id:'legacy-v2',palette:['#211d19'],durationMs:75000,strokes:[{id:'one',order:1,stageId:'01',colorIndex:0,baseWidth:12,durationWeight:1,opacity:.9,points:[[.1,.2,.1],[.4,.25,.9]]}]});
assert.equal(pressure.rendererVersion,2);
const canvas={width:0,height:0,isConnected:true,getBoundingClientRect(){return {width:600,height:420}},getContext(){return ctx()}};
const master={width:1500,height:1049};const atlas={width:1500,height:5245};const events=[];
const renderer=api.createRenderer(canvas,prepared,m=>events.push(m),master,atlas);renderer.replay();assert.ok(raf.length);raf.shift()(15000);assert.ok(events.at(-1).count>0&&events.at(-1).count<100);while(raf.length)raf.shift()(30000);assert.equal(events.at(-1).complete,true);assert.equal(events.at(-1).total,100);assert.ok(calls.drawImage>0);renderer.stop();
const activeClear=catalog.artworks.find(a=>a.weather.includes('clear'));const activeRain=catalog.artworks.find(a=>a.weather.includes('rain'));
assert.equal(activeClear.id,'clear-maple-pavilion-003');assert.equal(activeClear.renderMode,'ordered-master-brush-reveal');assert.equal(activeClear.durationMs,30000);assert.equal(activeClear.gestureCount,100);
assert.equal(activeRain.id,'rainy-tea-afternoon-001');assert.equal(activeRain.renderMode,'ordered-ink-wash-paths');
console.log('PASS: Clear uses exactly 100 ordered brush-reveal gestures in 30 seconds.');
console.log('PASS: five-stage order is thick, attached thin, air/birds/little things, leaves, then sun and finish.');
console.log('PASS: transparent stage masks clip the animated brushes to the original master.');
console.log('PASS: schema-v1 Rain and schema-v2 legacy Clear rendering remain supported.');
console.log('PASS: invalid duration, stroke count, pressure and stage order are rejected.');
console.log('PASS: the active Clear catalogue points to the master reveal; Rain catalogue remains unchanged.');
