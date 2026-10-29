import { readFile, writeFile } from 'node:fs/promises';
import { CASES } from '../src/lab/cases';
import { analyzeCase, compare, makeBaseline, makeReport, readBaseline, validateCases } from '../src/lab/engine';

const help = `半翻分词实验台：批量分析（不启动网站、不访问工作区译文）

npm run tokenizer:report -- [选项]
  --cases 路径           读取 JSON 样例集；默认使用内置样例
  --text-file 路径       读取一份 UTF-8 原文；不能与 --cases 同用
  --out 路径            将报告写入 JSON 文件；省略时输出到终端
  --baseline 路径       与此前下载 / 保存的对照比较
  --save-baseline 路径  将本轮结果保存为对照
  --help                显示帮助

预期待确认项不会被当作已确认标准。输出差异也不自动代表质量退步。
每份原文最多 30000 个 UTF-16 代码单元，样例集最多 200 项。`;

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help')) { console.log(help); return; }
  const options = new Map<string, string>();
  const names = new Set(['--cases', '--text-file', '--out', '--baseline', '--save-baseline']);
  for (let i = 0; i < args.length; i += 2) {
    if (!names.has(args[i]) || !args[i + 1] || args[i + 1].startsWith('--') || options.has(args[i])) throw new Error(`不支持或缺少参数：${args[i]}。使用 --help 查看说明。`);
    options.set(args[i], args[i + 1]);
  }
  if (options.has('--cases') && options.has('--text-file')) throw new Error('--cases 与 --text-file 只能选一个。');
  let corpus = CASES;
  if (options.has('--cases')) corpus = validateCases(JSON.parse((await readFile(options.get('--cases')!, 'utf8')).replace(/^\uFEFF/, '')));
  if (options.has('--text-file')) corpus = validateCases([{
    id: 'custom', title: '自定义输入', source: await readFile(options.get('--text-file')!, 'utf8'), review: 'unannotated', expectations: [],
  }]);
  const baseline = options.has('--baseline') ? readBaseline((await readFile(options.get('--baseline')!, 'utf8')).replace(/^\uFEFF/, '')) : null;
  if (options.has('--baseline') && !baseline) throw new Error('对照格式不正确，请使用实验台导出的对照文件。');
  const results = corpus.map(analyzeCase);
  const report = {
    ...makeReport(results),
    comparison: baseline ? { createdAt: baseline.createdAt, parserVersion: baseline.parserVersion,
      cases: results.map(result => ({ id: result.id, diff: compare(result, baseline) })) } : null,
  };
  const json = JSON.stringify(report, null, 2) + '\n';
  if (options.has('--out')) await writeFile(options.get('--out')!, json, 'utf8');
  else process.stdout.write(json);
  if (options.has('--save-baseline')) await writeFile(options.get('--save-baseline')!, JSON.stringify(makeBaseline(results), null, 2) + '\n', 'utf8');
}
main().catch(error => { console.error(String(error)); process.exitCode = 1; });
