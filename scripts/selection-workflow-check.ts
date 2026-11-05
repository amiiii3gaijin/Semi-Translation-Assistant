import assert from 'node:assert/strict';
import type { Sentence } from '../src/types';
import { singleSelection, moveGroupedSelection, expandSelection, shrinkSelection, sourceText } from '../src/utils/sourceSelection';
import { automaticSelection } from '../src/utils/automaticSelection';
import { useSelectionStore } from '../src/store/useSelectionStore';
import { prepareImport, buildAssistedSentences } from '../src/utils/llmImport';

const s: Sentence = { id: 'test', index: 0, originalText: '甲乙丙丁戊己庚', parserVersion: 5,
  translatedText: '', status: 'active', activeTokenIndex: 2,
  tokens: [...'甲乙丙丁戊己庚'].map((text, i) => ({ id: String(i), text, start: i, end: i + 1, isPunctuation: false })),
  groups: [{ id: 'a', startIndex: 1, endIndex: 2, label: '乙丙', kind: 'term' },
    { id: 'b', startIndex: 4, endIndex: 5, label: '戊己', kind: 'term' }],
  candidateGroups: [{ id: 'c', startIndex: 1, endIndex: 5, label: '乙丙丁戊己', kind: 'phrase', autoSelect: false }] };
useSelectionStore.getState().setEntry({ sentenceId: s.id, index: 2 });
const automatic = automaticSelection(s)!;
assert.equal(shrinkSelection(automatic).cursor, 2, 'right entry shrinks to last word');
const outer = expandSelection(automatic, s);
assert.equal(outer.end, 5);
assert.deepEqual(shrinkSelection(outer), automatic, 'nested undo preserves automatic shrink history');
const fine = singleSelection(s, 2, 'preview');
assert.deepEqual(shrinkSelection(expandSelection(fine, s)), fine, 'explicit expansion returns to chosen fine word');
useSelectionStore.getState().setEntry({ sentenceId: s.id, index: 1 });
assert.equal(shrinkSelection(automaticSelection(s)!).cursor, 1, 'left entry shrinks to first word');
useSelectionStore.getState().setEntry({ sentenceId: s.id, index: 2 });
assert.equal(shrinkSelection(automaticSelection(s)!).cursor, 2, 'vertical or pointer landing is retained');
let selection = singleSelection(s, 3, 'keyboard');
selection = moveGroupedSelection(selection, s, 1);
assert.deepEqual([selection.start, selection.end], [3, 5]);
const shrunkRight = shrinkSelection(selection);
assert.deepEqual([shrunkRight.start, shrunkRight.end, shrunkRight.cursor], [3, 4, 4], '7 keeps anchor and returns to first word of new group');
assert.deepEqual([expandSelection(shrunkRight, s).start, expandSelection(shrunkRight, s).end], [3, 5], '9 restores group after 7');
const fineStep = moveGroupedSelection(shrunkRight, s, 1, { start: 4, end: 5 });
assert.equal(fineStep.blockStart, 5, 'subsequent movement stays fine inside collapsed group');
selection = moveGroupedSelection(selection, s, -1);
assert.deepEqual([selection.start, selection.end], [3, 3], 'reverse removes whole group');
selection = moveGroupedSelection(selection, s, -1);
assert.deepEqual([selection.start, selection.end], [1, 3], 'crossing anchor selects whole left group');
const shrunkLeft = shrinkSelection(selection);
assert.deepEqual([shrunkLeft.start, shrunkLeft.end, shrunkLeft.cursor], [2, 3, 2], 'leftwards entry shrinks to last word and keeps previous range');
const wide = moveGroupedSelection(singleSelection(s, 0, 'keyboard'), s, 1);
assert.deepEqual([shrinkSelection(wide).start, shrinkSelection(wide).end], [0, 1]);
selection = moveGroupedSelection(selection, s, 1);
assert.deepEqual([selection.start, selection.end], [3, 3]);
assert.equal(moveGroupedSelection(singleSelection(s, 3, 'keyboard'), s, 1, { start: 4, end: 5 }).end, 4);
const atEnd = singleSelection(s, 6, 'keyboard');
assert.deepEqual(moveGroupedSelection(atEnd, s, 1), atEnd, 'document edge is stable');
let fromGroup: ReturnType<typeof singleSelection> = { ...automatic, mode: 'keyboard' };
fromGroup = moveGroupedSelection(fromGroup, s, -1);
assert.deepEqual([fromGroup.start, fromGroup.end], [0, 2]);
fromGroup = moveGroupedSelection(fromGroup, s, 1);
assert.deepEqual([fromGroup.start, fromGroup.end], [1, 2], 'original group anchor survives reversal');
assert.deepEqual([shrinkSelection(fromGroup).start, shrinkSelection(fromGroup).end], [1, 1], 'returning to anchor group still allows 7');
assert.equal(sourceText(s, 1, 5), '乙丙丁戊己');
const prep = await prepareImport('普通用户自己的说法。设备配置需要修改。', '');
const result = await buildAssistedSentences(prep, { version: 2, document: prep.key, complete: true,
  terms: ['普通用户'], suggestions: ['普通用户自己的说法', '设备配置需要修改'], exceptions: [] });
assert.equal(result.map(s => s.tokens.map(t => t.text).join('')).join(''), prep.source);
const first = result[0];
assert.ok(first.groups.some(g => g.label === '普通用户' && g.autoSelect));
assert.ok(first.candidateGroups?.some(g => g.label === '普通用户自己的说法'));
const group = first.groups.find(g => g.label === '普通用户')!;
const small = expandSelection(singleSelection(first, group.startIndex, 'preview'), first);
const large = expandSelection(small, first);
assert.equal(sourceText(first, large.start, large.end), '普通用户自己的说法');
assert.deepEqual(shrinkSelection(large), small);
assert.ok(result.some(s => s.groups.some(g => g.label === '设备配置' && g.autoSelect !== false)), 'optional range never suppresses local default');
console.log('Passed: whole-group movement, reversal, anchor crossing, fine override, entry landing, nested expansion/undo, source integrity and local defaults.');
