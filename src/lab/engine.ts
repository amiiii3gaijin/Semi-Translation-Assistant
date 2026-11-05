import { parseSentence } from '../utils/parseSentence';
import { splitTextIntoSentences } from '../utils/textSplitter';
import { PARSER_VERSION, type TokenTrace } from '../utils/tokenizer';
import type { GroupTrace } from '../utils/tokenGroups';
import type { LabCase } from './cases';
import { createParserContext } from '../utils/documentTerms';

export const REPORT_SCHEMA = 1;
export const LAB_LIMIT = 30000;
export function analyzeCase(sample: LabCase) {
  if (sample.source.length > LAB_LIMIT) throw new Error(`单个样例最多 ${LAB_LIMIT} 个字符，请拆分后分析。`);
  const started = performance.now();
  const context = createParserContext(sample.source);
  let offset = 0;
  const sentences = splitTextIntoSentences(sample.source).map((source, index) => {
    const trace: GroupTrace[] = [];
    const tokenTrace: TokenTrace[] = [];
    const parsed = parseSentence(source, `lab_${index}`, t => trace.push(t), t => tokenTrace.push(t), context, offset);
    const result = { source, offset, ...parsed, trace, tokenTrace };
    offset += source.length;
    return result;
  });
  const integrityErrors: string[] = [];
  if (sentences.map(s => s.source).join('') !== sample.source) integrityErrors.push('断句结果未完整还原原文（包括空白）。');
  for (const [index, sentence] of sentences.entries()) {
    let end = 0;
    for (const token of sentence.tokens) {
      if (token.start !== end || token.end <= token.start || token.text !== sentence.source.slice(token.start, token.end)) {
        integrityErrors.push(`第 ${index + 1} 句细词偏移或文本不一致：${token.start}–${token.end}`);
      }
      end = token.end;
    }
    if (end !== sentence.source.length || sentence.tokens.map(t => t.text).join('') !== sentence.source) {
      integrityErrors.push(`第 ${index + 1} 句分词未完整覆盖原文。`);
    }
    let previousEnd = -1;
    for (const group of sentence.groups) {
      const first = sentence.tokens[group.startIndex];
      const last = sentence.tokens[group.endIndex];
      if (!first || !last || group.startIndex <= previousEnd || group.endIndex < group.startIndex ||
        group.label !== sentence.source.slice(first.start, last.end)) {
        integrityErrors.push(`第 ${index + 1} 句词组边界、重叠或原文对应异常：${group.label}`);
      }
      previousEnd = group.endIndex;
    }
  }
  const tokens = sentences.flatMap(s => s.tokens.map(t => ({ start: s.offset + t.start, end: s.offset + t.end })));
  const groups = sentences.flatMap(s => s.groups.filter(g => s.tokens[g.startIndex] && s.tokens[g.endIndex]).map(g => ({
    start: s.offset + s.tokens[g.startIndex].start, end: s.offset + s.tokens[g.endIndex].end,
  })));
  const checks = sample.expectations.map(expectation => {
    let at = -1;
    let from = 0;
    for (let i = 0; i <= (expectation.occurrence ?? 0); i++) {
      at = sample.source.indexOf(expectation.text, from);
      if (at < 0) break;
      from = at + expectation.text.length;
    }
    if (at < 0) return { expectation, status: 'invalid' as const, detail: '预期文本不在原文中。' };
    const end = at + expectation.text.length;
    const hasGroup = groups.some(g => g.start === at && g.end === end);
    const boundary = at + (expectation.offset ?? 0);
    const passed = expectation.kind === 'token' ? tokens.some(t => t.start === at && t.end === end)
      : expectation.kind === 'group' ? hasGroup
      : expectation.kind === 'no-group' ? !hasGroup
      : tokens.some(t => t.start === boundary || t.end === boundary);
    return { expectation, status: passed ? 'pass' as const : 'fail' as const, detail: `[${at}, ${end})` };
  });
  return { ...sample, documentTerms: context.terms, parserVersion: PARSER_VERSION, elapsedMs: performance.now() - started, sentences, integrityErrors, checks };
}
export type CaseResult = ReturnType<typeof analyzeCase>;
export interface LabReport { schema: typeof REPORT_SCHEMA; createdAt: string; parserVersion: number; results: CaseResult[] }
export function makeReport(results: CaseResult[]): LabReport {
  return { schema: REPORT_SCHEMA, createdAt: new Date().toISOString(), parserVersion: PARSER_VERSION, results };
}

/** Compact persistent baseline; does not touch workbench data or store full traces. */
export interface BaselineEntry {
  id: string; source: string; tokens: string[]; groups: string[]; integrityErrors: string[];
}
export interface Baseline { schema: 1; createdAt: string; parserVersion: number; entries: BaselineEntry[] }
export function toEntry(result: CaseResult): BaselineEntry {
  return {
    id: result.id, source: result.source, integrityErrors: result.integrityErrors,
    tokens: result.sentences.flatMap(s => s.tokens.map(t => JSON.stringify([s.offset + t.start, s.offset + t.end, t.text, t.pos]))),
    groups: result.sentences.flatMap(s => s.groups.filter(g => s.tokens[g.startIndex] && s.tokens[g.endIndex]).map(g => JSON.stringify([
      s.offset + s.tokens[g.startIndex].start, s.offset + s.tokens[g.endIndex].end, g.label, g.kind, g.autoSelect !== false,
    ]))),
  };
}
export function makeBaseline(results: CaseResult[]): Baseline {
  return { schema: 1, createdAt: new Date().toISOString(), parserVersion: PARSER_VERSION, entries: results.map(toEntry) };
}
export function readBaseline(raw: string | null): Baseline | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    if (value.schema !== 1 || typeof value.createdAt !== 'string' || typeof value.parserVersion !== 'number' || !Array.isArray(value.entries)) return null;
    if (!value.entries.every((e: BaselineEntry) => e && typeof e.id === 'string' && typeof e.source === 'string' &&
      [e.tokens, e.groups, e.integrityErrors].every(a => Array.isArray(a) && a.every(s => typeof s === 'string')))) return null;
    return value as Baseline;
  } catch { return null; }
}
export function compare(result: CaseResult, baseline: Baseline | null) {
  const old = baseline?.entries.find(e => e.id === result.id && e.source === result.source);
  if (!old) return null;
  const current = toEntry(result);
  const oldTokens = new Set(old.tokens), newTokens = new Set(current.tokens);
  const oldGroups = new Set(old.groups), newGroups = new Set(current.groups);
  return {
    removedTokens: old.tokens.filter(t => !newTokens.has(t)), addedTokens: current.tokens.filter(t => !oldTokens.has(t)),
    removedGroups: old.groups.filter(g => !newGroups.has(g)), addedGroups: current.groups.filter(g => !oldGroups.has(g)),
    oldIntegrityErrors: old.integrityErrors, newIntegrityErrors: current.integrityErrors,
  };
}

/** CLI corpus validation: reject malformed annotations rather than silently ignoring them. */
export function validateCases(value: unknown): LabCase[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > 200) throw new Error('样例必须是包含 1–200 项的 JSON 数组。');
  const ids = new Set<string>();
  for (const c of value) {
    if (!c || typeof c.id !== 'string' || !c.id || ids.has(c.id) || typeof c.title !== 'string' || typeof c.source !== 'string' ||
      c.source.length > LAB_LIMIT || (c.note !== undefined && typeof c.note !== 'string') ||
      !['proposed', 'accepted', 'unannotated'].includes(c.review) || !Array.isArray(c.expectations)) {
      throw new Error('样例格式不正确、ID 重复或原文过长。');
    }
    ids.add(c.id);
    for (const e of c.expectations) {
      if (!e || !['token', 'group', 'no-group', 'boundary'].includes(e.kind) || typeof e.text !== 'string' || !e.text ||
        (e.occurrence !== undefined && (!Number.isInteger(e.occurrence) || e.occurrence < 0)) ||
        (e.kind === 'boundary' && (!Number.isInteger(e.offset) || e.offset < 0 || e.offset > e.text.length))) {
        throw new Error(`样例 ${c.id} 的预期格式不正确。`);
      }
    }
  }
  return value as LabCase[];
}
