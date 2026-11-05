import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { proportionalRegionTarget, regionUnits } from '../src/utils/regionNavigation';

const listeners=new Map<string, Function[]>();
const globals=globalThis as any;
let cleanup:Function|undefined;
globals.__effect=(fn:Function)=>{cleanup=fn();};
const store=(initial:any)=>{ let state=initial; const subs=new Set<Function>(); const api:any=()=>state;
 api.getState=()=>state;api.subscribe=(fn:Function)=>{subs.add(fn);return()=>subs.delete(fn);};
 api.setState=(patch:any)=>{const prev=state;state={...state,...patch};subs.forEach(fn=>fn(state,prev));};return api;};
const sentence={id:'s',index:0,originalText:'甲乙丙丁',tokens:Array.from('甲乙丙丁').map((text,i)=>({id:String(i),text,start:i,end:i+1,isPunctuation:false})),groups:[],candidateGroups:[],parserVersion:7,translatedText:'',status:'active',activeTokenIndex:3};
const doc=store({sentences:[sentence],currentActiveIndex:0,documentId:'d'});
let pages=0;
doc.setState({setActiveTokenIndex:(_:string,index:number)=>doc.setState({sentences:[{...doc.getState().sentences[0],activeTokenIndex:index}]}),
 updateTranslation:(_:string,text:string)=>doc.setState({sentences:[{...doc.getState().sentences[0],translatedText:text}]}),
 prevSentence:()=>{pages--;},nextSentence:()=>{pages++;},markCurrentSentenceCompleted:()=>{}});
const pref=store({autoSelectGroups:true,captureUnit:'word',autoAdvanceAfterCapture:false,spaceCapturedWords:false,returnToTypingAfterCapture:true});
const selection=store({selection:null,entry:null,fineRange:null});
selection.setState({setSelection:(value:any)=>selection.setState({selection:value}),setEntry:(value:any)=>selection.setState({entry:value}),setFineRange:(value:any)=>selection.setState({fineRange:value})});
const mode=store({active:false});mode.setState({setActive:(active:boolean)=>mode.setState({active})});globals.__mode=mode;
globals.__doc=doc;globals.__pref=pref;globals.__selection=selection;
const area:any={value:'',selectionStart:0,selectionEnd:0,dataset:{sentenceId:'s'},isConnected:true,focus(){},setSelectionRange(a:number,b:number){this.selectionStart=a;this.selectionEnd=b;},closest(){return null;}};
globals.window={addEventListener:(name:string,fn:Function)=>listeners.set(name,[...(listeners.get(name)??[]),fn]),removeEventListener:(name:string,fn:Function)=>listeners.set(name,(listeners.get(name)??[]).filter(f=>f!==fn))};
globals.document={hidden:false,querySelector:()=>null,querySelectorAll:()=>[],execCommand:()=>false,addEventListener:globals.window.addEventListener,removeEventListener:globals.window.removeEventListener};
globals.requestAnimationFrame=(fn:Function)=>{fn();return 0;};
const bundle=await build({entryPoints:['src/hooks/useKeyboardShortcuts.ts'],bundle:true,write:false,format:'esm',platform:'node',plugins:[{name:'test-boundary',setup(b){
 b.onResolve({filter:/^(react)$|useDocumentStore$|usePreferencesStore$|useSelectionStore$|useCaptureModeStore$/},args=>({path:args.path,namespace:'mock'}));
 b.onLoad({filter:/.*/,namespace:'mock'},args=>({contents:args.path==='react'?'export default {};export const useEffect=globalThis.__effect;':args.path.endsWith('useCaptureModeStore')?'export const useCaptureModeStore=globalThis.__mode;':args.path.endsWith('useDocumentStore')?'export const useDocumentStore=globalThis.__doc;':args.path.endsWith('usePreferencesStore')?'export const usePreferencesStore=globalThis.__pref;':'export const useSelectionStore=globalThis.__selection;',loader:'js'}));
}}]});
const mod=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
mod.useKeyboardShortcuts({current:area});
const event=(type:string,code:string,extra:any={})=>{const e:any={code,target:area,repeat:false,ctrlKey:false,altKey:false,shiftKey:false,metaKey:false,isComposing:false,prevented:false,preventDefault(){this.prevented=true;},stopPropagation(){},...extra};listeners.get(type)?.forEach(fn=>fn(e));return e;};
const down=(c:string,e:any={})=>event('keydown',c,e),up=(c:string,e:any={})=>event('keyup',c,e);

const toggle=()=>{down('AltRight',{altKey:true});up('AltRight');};
assert.equal(down('KeyS').prevented,false,'normal typing untouched');
down('AltRight',{altKey:true});assert.equal(mode.getState().active,false,'activate only on release');
down('AltRight',{altKey:true,repeat:true});up('AltRight');assert.equal(mode.getState().active,true);
down('KeyS');down('KeyA');down('KeyA');up('KeyS');
assert.equal(area.value,'乙丙丁');assert.equal(doc.getState().sentences[0].activeTokenIndex,3);
assert.equal(mode.getState().active,false,'successful capture returns to typing');assert.equal(down('KeyS').prevented,false);
const before=area.value;
toggle();down('KeyS');down('Escape');up('KeyS');assert.equal(area.value,before);assert.equal(mode.getState().active,false);
toggle();down('KeyS');listeners.get('blur')?.forEach(fn=>fn());up('KeyS');assert.equal(area.value,before);
toggle();down('KeyQ',{isComposing:true});assert.equal(mode.getState().active,false);
down('AltRight',{altKey:true});down('KeyQ',{altKey:true});up('AltRight');assert.equal(mode.getState().active,false,'Alt chord never toggles');
toggle();assert.equal(down('KeyJ',{key:'j'}).prevented,true,'unmapped printable keys cannot leak into translation');toggle();assert.equal(mode.getState().active,false);
toggle();event('pointerdown','',{target:area});assert.equal(mode.getState().active,false,'clicking editor exits');
pref.setState({returnToTypingAfterCapture:false});toggle();down('KeyS');up('KeyS');assert.equal(mode.getState().active,true,'continuous mode');down('Escape');pref.setState({returnToTypingAfterCapture:true});
toggle();down('KeyS');area.value+='user edit';up('KeyS');assert.equal(mode.getState().active,true,'failed capture does not exit');down('Escape');
doc.getState().setActiveTokenIndex('s',0);down('Numpad3');assert.equal(doc.getState().sentences[0].activeTokenIndex,3);
const pageBaseline=pages;
for(const code of ['ControlLeft','ControlRight','ShiftLeft','ShiftRight']) {down(code,code.startsWith('Control')?{ctrlKey:true}:{shiftKey:true});up(code);}
assert.equal(pages,pageBaseline);down('NumpadEnter');assert.equal(pages,pageBaseline+1);down('PageUp');assert.equal(pages,pageBaseline);
// Swap semantics must run through the actual hook.
doc.setState({sentences:[{...sentence,activeTokenIndex:1,groups:[{id:'g',startIndex:1,endIndex:2,label:'乙丙',kind:'phrase',autoSelect:true}]}]});
selection.getState().setSelection(null);selection.getState().setFineRange({sentenceId:'s',start:1,end:2});
down('Numpad7');assert.equal(selection.getState().selection.end,2);down('Numpad9');assert.equal(doc.getState().sentences[0].activeTokenIndex,1);
toggle();down('KeyQ');toggle();
assert.equal(doc.getState().sentences[0].activeTokenIndex,1);
down('Numpad9');
pref.setState({autoAdvanceAfterCapture:true});doc.getState().setActiveTokenIndex('s',0);selection.getState().setFineRange(null);
down('Numpad5');up('Numpad5');assert.equal(doc.getState().sentences[0].activeTokenIndex,1,'advance goes right');

// Two logical regions share a card but only vertical navigation crosses the gap.
const annotated={...sentence,originalText:'甲乙丙丁〔注：庚辛壬〕',tokens:[...sentence.tokens,
 {id:'open',text:'〔注：',start:4,end:7,isMarkup:true,isAnnotation:true,isPunctuation:true},
 ...Array.from('庚辛壬').map((text,i)=>({id:'n'+i,text,start:7+i,end:8+i,isAnnotation:true,isPunctuation:false})),
 {id:'close',text:'〕',start:10,end:11,isMarkup:true,isAnnotation:true,isPunctuation:true}],activeTokenIndex:0};
doc.setState({sentences:[annotated]});selection.getState().setSelection(null);selection.getState().setFineRange(null);
assert.equal(proportionalRegionTarget({...annotated,activeTokenIndex:1} as any,true,true),6,'middle reading position maps proportionally');
assert.equal(proportionalRegionTarget({...annotated,activeTokenIndex:3} as any,true,true),7,'last position maps to last note unit');
assert.equal(regionUnits({...annotated,groups:[{id:'g',startIndex:0,endIndex:1,autoSelect:true}]} as any,false,true).length,3,'default group counts as one reading unit');
const root={offsetLeft:0,offsetTop:0,offsetParent:null};
const flow=(indices:number[],top:number)=>{const region:any={dataset:{sourceSentence:'s'},parentElement:root,offsetLeft:0,offsetTop:top,offsetParent:root,closest:()=>null};
 region.querySelectorAll=()=>indices.map((index,i)=>({dataset:{sourceToken:String(index)},offsetLeft:i*40,offsetTop:0,offsetWidth:30,offsetHeight:30,offsetParent:region}));return region;};
globals.document.querySelectorAll=()=>[flow([0,1,2,3],0),flow([5,6,7],100)];
globals.getComputedStyle=()=>({lineHeight:'40'});
down('Numpad3');assert.equal(doc.getState().sentences[0].activeTokenIndex,3,'end stays in body');
down('Numpad6');assert.equal(doc.getState().sentences[0].activeTokenIndex,3,'right cannot enter note');
down('Numpad5');up('Numpad5');assert.equal(doc.getState().sentences[0].activeTokenIndex,3,'auto advance cannot enter note');
down('Numpad2');assert.equal(doc.getState().sentences[0].activeTokenIndex,7,'down reaches note through visual rows');
down('Numpad4');assert.equal(doc.getState().sentences[0].activeTokenIndex,6);
toggle();down('KeyC');assert.equal(doc.getState().sentences[0].activeTokenIndex,7,'Alt C ends current note');
down('KeyW');assert.equal(doc.getState().sentences[0].activeTokenIndex,3,'Alt W restores body position');
down('KeyX');assert.equal(doc.getState().sentences[0].activeTokenIndex,7,'Alt X returns to note');toggle();
doc.getState().setActiveTokenIndex('s',5);down('Numpad4');assert.equal(doc.getState().sentences[0].activeTokenIndex,5,'left cannot leave note');
down('Numpad5');down('Numpad4');assert.equal(selection.getState().selection.start,5);up('Numpad5');
console.log('Actual hook: note/body vertical transitions, region end, horizontal boundaries and capture isolation passed.');
// Jumping to a grouped tail must respect automatic selection, including stale fine overrides.
const tailGroup={id:'tail',startIndex:2,endIndex:3,label:'丙丁',kind:'phrase',autoSelect:true};
doc.setState({sentences:[{...sentence,activeTokenIndex:0,groups:[tailGroup]}]});
selection.getState().setSelection(null);selection.getState().setFineRange({sentenceId:'s',start:2,end:3});
pref.setState({autoSelectGroups:true,autoAdvanceAfterCapture:false});
down('Numpad3');down('Numpad5');
assert.equal(selection.getState().selection.start,2,'end jump grabs full default group');
assert.equal(selection.getState().selection.end,3);up('Numpad5');
down('Numpad3');down('Numpad9');down('Numpad5');
assert.equal(selection.getState().selection.start,3,'explicit shrink after jump still selects final fine word');up('Numpad5');
pref.setState({autoSelectGroups:false});
toggle();down('KeyC');down('KeyS');
assert.equal(selection.getState().selection.start,3,'auto groups off keeps fine tail');up('KeyS');
pref.setState({autoSelectGroups:true});
doc.setState({sentences:[{...sentence,activeTokenIndex:0,groups:[{...tailGroup,autoSelect:false}]}]});
down('Numpad3');down('Numpad5');assert.equal(selection.getState().selection.start,3,'suggestions are never forced by end jump');up('Numpad5');
console.log('End jump: automatic groups, explicit shrink, disabled automatic mode and optional suggestions passed.');
cleanup?.();console.log('Actual keyboard hook: Alt layer, reverse capture, cancellation, composition, Enter paging, 7/9 swap and end jump passed (simulated DOM).');
