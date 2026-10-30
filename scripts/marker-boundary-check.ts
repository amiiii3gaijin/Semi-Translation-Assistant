import assert from 'node:assert/strict';
import { fittedDashes } from '../src/utils/markerPolicy';
import { prepareImport, buildAssistedSentences } from '../src/utils/llmImport';
import { phraseMarkers } from '../src/utils/phraseMarkers';
import { singleSelection, expandSelection } from '../src/utils/sourceSelection';
for (const font of [16,25,40,60]) for (let length = 3; length <= 700; length += 1.7) {
  const [dash, gap] = fittedDashes(length,font)!.split(' ').map(Number);
  const n = Math.round((length + gap)/(dash + gap));
  assert.ok(dash > 0 && gap > 0);
  assert.ok(Math.abs(n* dash + (n-1)*gap - length) < 1e-8, 'complete equal dashes at both ends');
}
const prep = await prepareImport('卫生系统缺少通用能力。冲突和流动的地方。', '');
const sentences = await buildAssistedSentences(prep, { version:3, document:prep.key, complete:true,
  terms:['卫生系统','通用能力','冲突和流动'], suggestions:['缺少通用能力','冲突和流动的地方'],consistency:[],exceptions:[] });
const first=sentences[0];
const lines=phraseMarkers(first,true,false);
const core=first.groups.find(g=>g.label==='通用能力')!;
const lack=first.tokens.findIndex(t=>t.text==='缺少');
const solid=lines.find(m=>m.startIndex===core.startIndex)!;
const dashed=lines.find(m=>m.startIndex<=lack && m.endIndex>=lack)!;
assert.equal(solid.connection,dashed.connection);
const independent={...first,groups:[...first.groups,{id:'independent',startIndex:0,endIndex:0,label:first.tokens[0].text,kind:'phrase' as const,autoSelect:true}]};
assert.notEqual(phraseMarkers(independent,true,false).find(m=>m.startIndex===0)!.connection, solid.connection);
const second=sentences[1];
const group=second.groups.find(g=>g.label==='冲突和流动')!;
const selected=expandSelection(singleSelection(second,group.startIndex,'preview'),second);
assert.equal(expandSelection(selected,second), selected, 'generic suffix not offered by keyboard');
assert.ok(!phraseMarkers(second,true,false).some(m=>m.endIndex>group.endIndex),'generic suffix not advertised');
console.log('Candidate connections, generic suffix filtering and equal complete dash fitting passed.');
