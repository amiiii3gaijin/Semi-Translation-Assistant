export interface Expectation {
  kind: 'token' | 'group' | 'no-group' | 'boundary';
  text: string;
  /** Zero-based occurrence in the source. Boundary is relative to this text. */
  occurrence?: number;
  offset?: number;
}
export interface LabCase {
  id: string;
  title: string;
  source: string;
  review: 'proposed' | 'accepted' | 'unannotated';
  note?: string;
  expectations: Expectation[];
}

// Partial expectations, not a claim that there is one correct full segmentation.
export const CASES: LabCase[] = [
  { id: 'language-culture', title: '截图：语言和文化', review: 'proposed',
    source: '2. 被提到最多的是语言和文化，有24次：学生们**也许**觉得日常英语还可以，难的是医学上的专门说法。',
    note: '按截图转录；词边界预期待用户确认。Markdown 符号目前保留。',
    expectations: [{ kind: 'token', text: '语言' }, { kind: 'token', text: '文化' }] },
  { id: 'hospital', title: '截图：看专科医生', review: 'proposed',
    source: '4. 也有学生说，他们在中国习惯直接去医院看专科医生；可是在澳大利亚，要先看 GP，再根据情况转诊。',
    note: '“中国习惯”不应作为一个词组；其他短语的选择范围尚未定稿。',
    expectations: [{ kind: 'no-group', text: '中国习惯' }, { kind: 'group', text: '专科医生' }] },
  { id: 'health-coverage', title: '截图：全民健康覆盖', review: 'proposed',
    source: '2. 第11周的课程页面上问过：澳大利亚有没有 universal health coverage，也就是全民健康覆盖？',
    expectations: [{ kind: 'boundary', text: '周的', offset: 1 }, { kind: 'group', text: '全民健康覆盖' },
      { kind: 'no-group', text: '也就是全民健康' }] },
  { id: 'student', title: '一年级大学生', review: 'proposed',
    source: '一年级大学生对某一特定疾病的社交距离意愿下降。',
    expectations: [{ kind: 'token', text: '一年级' }, { kind: 'token', text: '大学生' },
      { kind: 'group', text: '一年级大学生' }, { kind: 'group', text: '社交距离意愿' }] },
  { id: 'statistics', title: '统计表达式与空格', review: 'proposed',
    source: '我们用一个配对样本 t 检验比较 SDS 平均分。\n\tM = 2.17，SD = 0.54；t(1895) = 41.56，p < .001。',
    expectations: [{ kind: 'group', text: '配对样本 t 检验' }, { kind: 'group', text: 'M = 2.17' },
      { kind: 'group', text: 't(1895) = 41.56' }] },
  { id: 'citations', title: '带重音的人名与引用', review: 'unannotated',
    source: "Conceição et al. (2022) 与 Janoušková et al. (2017) 的研究，报告 Cohen's d = 0.954（见 Figure 1）。", expectations: [] },
  { id: 'quotation', title: '引号、括号与嵌套', review: 'unannotated',
    source: '他们指出：“社会接触（包括影像接触）能够改变反应。”但这不等于“社交距离意愿”一定下降。', expectations: [] },
  { id: 'repeated-term', title: '重复术语', review: 'proposed',
    source: '总体态度量表上的改变推不出社交距离意愿的下降；必须把社交距离意愿本身作为结局直接测量。',
    expectations: [{ kind: 'group', text: '社交距离意愿', occurrence: 0 }, { kind: 'group', text: '社交距离意愿', occurrence: 1 }] },
  { id: 'whitespace', title: '原文完整性：空白和 Unicode', review: 'unannotated',
    source: '\r\n  学生\t们  讨论 café 与 e\u0301、🙂。\r\n\r\n下一行。  \n', expectations: [] },
  { id: 'blank', title: '边界情况：纯空白', review: 'unannotated', source: ' \t\r\n ', expectations: [],
    note: '纯空白也应完整保留，不能在断句时丢失。' },
];
