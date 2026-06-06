🌸 Code Quality Analysis Report 🌸

📑 Table of Contents

  • Issue Score (#overall-score)
  • Metrics Details (#metrics-details)
  • Problem Files Ranking (#problem-files)
  • Diagnosis (#conclusion)

!Score (https://img.shields.io/badge/Score-87%25-brightgreen)

Issue Score {#overall-score}

┌─────────────────┬───────────────────────┐
│ Metrics Summary │ Score                 │
├─────────────────┼───────────────────────┤
│ Issue Score     │ 87.35/100             │
│ Quality Level   │ 🌸 A whiff of trouble │
└─────────────────┴───────────────────────┘

  │ Fresh and pleasant, like morning dew—almost makes you want to refactor for f
    un

📊 Statistics

┌─────────────┬────────┐
│ Metric      │ Value  │
├─────────────┼────────┤
│ Total Files │ 59     │
│ Skipped     │ 4      │
│ Time        │ 2421ms │
└─────────────┴────────┘

Metrics Details {#metrics-details}

┌───────────────────────┬────────┬────────┐
│ Metrics Summary       │ Score  │ Status │
├───────────────────────┼────────┼────────┤
│ Cyclomatic Complexity │ 9.71%  │ ✓✓     │
│ Cognitive Complexity  │ 11.23% │ ✓✓     │
│ Nesting Depth         │ 8.89%  │ ✓✓     │
│ Function Length       │ 3.66%  │ ✓✓     │
│ File Length           │ 2.33%  │ ✓✓     │
│ Parameter Count       │ 0.00%  │ ✓✓     │
│ Code Duplication      │ 0.28%  │ ✓✓     │
│ Structure Analysis    │ 3.20%  │ ✓✓     │
│ Error Handling        │ 25.38% │ ✓      │
│ Comment Ratio         │ 25.23% │ ✓      │
│ Naming Convention     │ 0.00%  │ ✓✓     │
└───────────────────────┴────────┴────────┘

Problem Files Ranking {#problem-files}

1. cli/output/markdown.ts

Issue Score: 30.69

Issues: 🔄 Complexity Issues: 3, ⚠️ Other Issues: 2, 🏗️ Structure Issues: 1, 📝
 Comment Issues: 1

  • 🔄 render() L39: Complexity: 32
  • 🔄 render() L39: Cognitive Complexity: 42
  • 🔄 render() L39: Nesting Depth: 5
  • 📏 render() L39: 273 Size
  • 🏗️ render() L39: High nesting: 5

2. parser/regex-parser.ts

Issue Score: 26.31

Issues: 🔄 Complexity Issues: 11, ⚠️ Other Issues: 1, 🏗️ Structure Issues: 8, ❌
 Error Handling Issues: 1, 📝 Comment Issues: 1

  • 🔄 extractFunctionsBrace() L301: Complexity: 13
  • 🔄 extractClassesIndent() L503: Complexity: 11
  • 🔄 extractFunctionsBrace() L301: Cognitive Complexity: 21
  • 🔄 countClassMembers() L405: Cognitive Complexity: 16
  • 🔄 extractFunctionsIndent() L444: Cognitive Complexity: 18
  • 🔍 ...and 15 more issues too smelly to list

3. metrics/duplication/code-duplication.ts

Issue Score: 23.75

Issues: 🔄 Complexity Issues: 5, 🏗️ Structure Issues: 3, 📝 Comment Issues: 1

  • 🔄 extractControlFlowSignature() L122: Complexity: 11
  • 🔄 calculate() L35: Cognitive Complexity: 18
  • 🔄 extractControlFlowSignature() L122: Cognitive Complexity: 27
  • 🔄 calculate() L35: Nesting Depth: 4
  • 🔄 extractControlFlowSignature() L122: Nesting Depth: 8
  • 🔍 ...and 3 more issues too smelly to list

4. parser/tree-sitter-parser.ts

Issue Score: 23.42

Issues: 🔄 Complexity Issues: 5, ⚠️ Other Issues: 1, 🏗️ Structure Issues: 7, ❌ 
Error Handling Issues: 1, 📝 Comment Issues: 1

  • 🔄 countParameters() L829: Complexity: 11
  • 🔄 countParameters() L829: Cognitive Complexity: 21
  • 🔄 extractFunctionName() L749: Nesting Depth: 4
  • 🔄 scan() L805: Nesting Depth: 4
  • 🔄 countParameters() L829: Nesting Depth: 5
  • 🔍 ...and 8 more issues too smelly to list

5. cli/commands/clone-and-analyze.ts

Issue Score: 21.01

Issues: 🔄 Complexity Issues: 2, ⚠️ Other Issues: 1, 🏗️ Structure Issues: 1, ❌ 
Error Handling Issues: 3, 📝 Comment Issues: 1

  • 🔄 runCloneAnalyze() L71: Complexity: 23
  • 🔄 runCloneAnalyze() L71: Cognitive Complexity: 29
  • 📏 runCloneAnalyze() L71: 164 Size
  • 🏗️ runCloneAnalyze() L71: Medium nesting: 3
  • ❌ L179: Unhandled error-prone call
  • 🔍 ...and 2 more issues too smelly to list

6. cli/output/console.ts

Issue Score: 20.86

Issues: 🔄 Complexity Issues: 3, ⚠️ Other Issues: 1, 📋 Duplication Issues: 1, 
🏗️ Structure Issues: 1, 📝 Comment Issues: 1

  • 🔄 getMetricComment() L550: Complexity: 11
  • 🔄 getMetricComment() L550: Cognitive Complexity: 21
  • 🔄 getMetricComment() L550: Nesting Depth: 5
  • 📋 getStatusEmoji() L600: Duplicate pattern: getStatusEmoji, getStatusColor,
     getScoreColor
  • 🏗️ getMetricComment() L550: High nesting: 5

7. config/index.ts

Issue Score: 16.25

Issues: 🔄 Complexity Issues: 2, ⚠️ Other Issues: 2

  • 🔄 loadAIConfig() L96: Complexity: 28
  • 🔄 loadAIConfig() L96: Cognitive Complexity: 32
  • 📏 loadAIConfig() L96: 177 Size

8. metrics/structure/structure-analysis.ts

Issue Score: 15.07

Issues: 🔄 Complexity Issues: 2, ⚠️ Other Issues: 1, 🏗️ Structure Issues: 1, 📝
 Comment Issues: 1

  • 🔄 calculate() L37: Complexity: 24
  • 🔄 calculate() L37: Cognitive Complexity: 30
  • 📏 calculate() L37: 130 Size
  • 🏗️ calculate() L37: Medium nesting: 3

9. metrics/size/function-length.ts

Issue Score: 14.52

Issues: 🔄 Complexity Issues: 3, 🏗️ Structure Issues: 1, 📝 Comment Issues: 1

  • 🔄 calculate() L24: Complexity: 17
  • 🔄 calculate() L24: Cognitive Complexity: 25
  • 🔄 calculate() L24: Nesting Depth: 4
  • 🏗️ calculate() L24: Medium nesting: 4

10. metrics/complexity/cyclomatic.ts

Issue Score: 14.38

Issues: 🔄 Complexity Issues: 3, 🏗️ Structure Issues: 1, 📝 Comment Issues: 1

  • 🔄 calculate() L26: Complexity: 17
  • 🔄 calculate() L26: Cognitive Complexity: 25
  • 🔄 calculate() L26: Nesting Depth: 4
  • 🏗️ calculate() L26: Medium nesting: 4

Diagnosis {#conclusion}

🌸 A whiff of trouble - Mostly fine, but a little stinky. Air it out and you'll 
survive

👍 Keep going, you're the clean freak of the coding world, a true code hygiene c
hampion

────────────────────────────────────────────────────────────────────────────────

Generated by fuck-u-code (https://github.com/Done-0/fuck-u-code)
