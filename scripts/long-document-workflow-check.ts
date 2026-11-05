import assert from 'node:assert/strict';
import { tokenize } from '../src/utils/tokenizer';
import { parseSentence } from '../src/utils/parseSentence';
import { selectionCandidates } from '../src/utils/selectionCandidates';
import { connectMarkers, type MarkerSegment } from '../src/utils/markerConnections';
import { prepareImport, buildAssistedSentences, makePrompt } from '../src/utils/llmImport';
import { commandCode } from '../src/utils/keyboardCommands';
import { phraseMarkers } from '../src/utils/phraseMarkers';
import type { Sentence } from '../src/types';
const sentence=(text:string):Sentence=>({id:'test',index:0,originalText:text,...parseSentence(text,'test'),parserVersion:7,translatedText:'',status:'active',activeTokenIndex:0});
for(const [text,word] of [['已有的控制措施','已有'],['长期带毒却不发病','带毒'],['那几周无人察觉','几周'],['传播了数周','数周']]) {
  const tokens=tokenize(text,'check'); assert.equal(tokens.map(t=>t.text).join(''),text); assert.ok(tokens.some(t=>t.text===word)); assert.ok(!tokens.some(t=>t.text==='周无人'));
}
assert.ok(!tokenize('周围环境','neg').some(t=>t.text==='周'));
const short=sentence('威胁因此放大，水平偏低。');
const clauses=selectionCandidates(short); assert.ok(clauses.length>0); assert.ok(clauses.every(g=>!/[，。]/.test(g.label)));
const excluded={...short,excludedGroupRanges:[{start:0,end:short.originalText.length}]};assert.equal(selectionCandidates(excluded).length,0);
const crossing={...short,groups:[{id:'cross',startIndex:1,endIndex:short.tokens.length-2,label:'cross',kind:'phrase' as const}]};
assert.equal(selectionCandidates(crossing).length,0);
const source=Array.from({length:20},(_,i)=>i % 2 ? '卫生系统需要能力。' : '卫生系统保护社区。').join('\n')+'\n长期带毒的动物。那几周无人察觉。';
const prep=await prepareImport(source,'');
assert.equal(prep.frequent.find(t=>t.text==='卫生系统')?.count,20);
assert.ok(!prep.frequent.some(t=>t.text==='卫生'||t.text==='系统'));
assert.ok(makePrompt(prep).includes('分阶段适应宿主'));
const local=await prepareImport('主动准备的反复失败。进入冲突地区的能力。','');
const imported=await buildAssistedSentences(local,{version:3,document:local.key,complete:true,terms:['主动准备','反复失败','冲突地区','进入冲突地区的能力'],suggestions:['主动准备的反复失败'],consistency:[],exceptions:[]});
assert.ok(imported[1].groupDecisions?.some(d=>d.text==='进入冲突地区的能力'&&d.outcome==='nested-candidate'));
assert.ok(imported[0].groupDecisions?.some(d=>d.source==='llm-suggestion'));
const m=(id:string,x:number,start:number,end:number,connection:string,row=0):MarkerSegment=>({id,x,y:10,width:20,height:2,row,start,end,connection,dashed:false,consistent:false});
const joined=connectMarkers([m('a',0,0,0,'same'),m('b',24,1,1,'same')],25);
assert.equal(joined.filter(m=>m.dot).length,1); assert.ok(joined[0].width<=20); assert.ok(joined[1].x>=24);
assert.equal(connectMarkers([m('a',0,0,0,'one'),m('b',24,1,1,'two')],25).filter(m=>m.dot).length,0);
assert.equal(connectMarkers([m('a',0,0,0,'same'),m('b',0,1,1,'same',1)],25).filter(m=>m.dot).length,2);
for (const s of imported) {
 const baseline=phraseMarkers(s,true,false);
 for(let i=0;i<s.tokens.length;i++) assert.deepEqual(phraseMarkers({...s,activeTokenIndex:i},true,false),baseline);
}
assert.equal(commandCode('KeyQ',true),'Numpad7');assert.equal(commandCode('KeyS',true),'Numpad5');assert.equal(commandCode('KeyS',false),'KeyS');
console.log('Long-document preparation, fine boundaries, clause exclusions, provenance, static dots and keyboard mapping passed.');
