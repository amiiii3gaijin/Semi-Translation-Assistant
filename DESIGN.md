---
name: 半翻
description: 中译英半翻译工作台，一次只看一句，键盘抓词。
colors:
  signal-blue: "oklch(62.3% 0.214 259.815)"
  signal-blue-deep: "oklch(54.6% 0.245 262.881)"
  paper: "#ffffff"
  ink: "#1f2937"
  graphite: "#4b5563"
  muted: "#6b7280"
  hairline: "rgba(17, 24, 39, 0.065)"
  annotation-gray: "#626b78"
  punctuation-gray: "#9ca3af"
  ribbon-gray: "#a3a9b3"
  term-navy: "#173b53"
  well: "#f5f6f8"
typography:
  display:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, Segoe UI, Microsoft YaHei, PingFang SC, Helvetica Neue, Arial, sans-serif"
    fontSize: "32px"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  headline:
    fontSize: "22px"
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: "-0.025em"
  source:
    fontSize: "25px"
    fontWeight: 600
    lineHeight: 2
  translation:
    fontSize: "25px"
    fontWeight: 500
    lineHeight: 1.6
  body:
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.7
  title:
    fontSize: "14px"
    fontWeight: 650
    lineHeight: 1.5
  label:
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1.5
rounded:
  word: "10px"
  control: "12px"
  panel: "24px"
  card: "32px"
  pill: "999px"
spacing:
  edge: "24px"
  footer-edge: "32px"
  card-gutter: "32px"
components:
  button-primary:
    backgroundColor: "{colors.signal-blue}"
    textColor: "{colors.paper}"
    rounded: "{rounded.pill}"
    padding: "8px 20px"
  button-primary-hover:
    backgroundColor: "{colors.signal-blue-deep}"
  button-surface:
    backgroundColor: "rgba(255, 255, 255, 0.88)"
    textColor: "{colors.graphite}"
    rounded: "{rounded.pill}"
    padding: "8px 20px"
  button-surface-hover:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.signal-blue}"
  button-quiet:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
  cursor-typing:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.word}"
  cursor-capture:
    backgroundColor: "{colors.signal-blue}"
    textColor: "{colors.paper}"
    rounded: "{rounded.word}"
  translation-selection:
    backgroundColor: "{colors.signal-blue}"
    textColor: "{colors.paper}"
    rounded: "0.3em"
  sentence-card:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.card}"
    padding: "24px 10px"
  progress-pill:
    backgroundColor: "rgba(255, 255, 255, 0.98)"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "10px 20px"
---

# Design System: 半翻

## Overview

**Creative North Star: "白纸上的一枚蓝键"**

整个界面是一张白纸。纸上的东西只有两种做法，闲着的是白色按钮，现在能触发的是蓝色按钮。蓝色很少，所以你的眼睛永远知道下一步在哪。

这是一个「操作型」界面，用的人只有一个熟手，大部分时间手在键盘上。一次只显示一句，原文在上，译文在下，中间一条渐隐的细线。工具栏、进度和设置都缩在四个角上，用浮起的白色按钮表示，不抢句子的位置。

动效很轻。东西被选中就浮起一点、放大一点，鼠标移上去浮起两像素、影子加深，按下去回落。没有弹跳，没有装饰性的动画。

**Key Characteristics:**
- 只有两种材质，白色按钮配灰色柔影，蓝色按钮配蓝色光晕。
- 蓝色等于「现在」，不用来装饰。
- 大面积留白，句子居中，四角放工具。
- 圆角从字到卡片分五档，越大的东西越圆。
- 选中和悬停用「浮起」表达，不用描边。

## Colors

一个蓝色，加一组偏冷的灰，底色是纯白。

### Primary
- **信号蓝**（signal-blue）。主按钮、抓取模式下的光标、打开的开关、进度条、加载条、帮助里最重要的那个快捷键。凡是蓝色，都表示「这个现在起作用」或「下一步按这里」。导入页的「复制提示词」按钮复制前是蓝的，复制后退成白色，就是这条规矩的实例。
- **深信号蓝**（signal-blue-deep）。只用于蓝色按钮的悬停。

### Neutral
- **纸白**（paper）。页面、卡片、白色按钮和打字模式光标的底色。
- **墨色**（ink）。正文、原文、译文。
- **石墨灰**（graphite）。白色按钮上的图标和文字，设置项文字。
- **说明灰**（muted）。说明文字、次要标签、安静按钮。
- **发丝线**（hairline）。卡片、面板、分隔线的边。
- **注释灰**（annotation-gray）。原文里的注释段。
- **标点灰**（punctuation-gray）。原文里的标点，让标点退后。
- **标线灰**（ribbon-gray）。原文下方的词组标线。
- **术语深蓝**（term-navy）。跨句重复的术语的标线。它在调色板之外，是现存的一处不一致。
- **凹槽灰**（well）。分段选择器的底槽、步骤编号的圆底。

### Named Rules
**两种材质规则。** 新元素只能做成白色按钮或蓝色按钮之一。白色按钮是白底、灰色柔影；蓝色按钮是蓝底、白字、蓝色光晕。不许发明第三种。
**蓝色等于现在规则。** 蓝色只给「此刻起作用」或「下一步」的东西。一个屏幕上同时亮着的蓝色越少越好。

## Typography

**Display Font:** 系统无衬线（苹果系统字体、Segoe UI、微软雅黑、苹方）
**Body Font:** 同上，全站一种字体

**Character:** 全站只用系统字体，中文和英文都由操作系统渲染，靠字重和字号拉开层级。

### Hierarchy
- **Display**（700，32px，行高 1.25，字距收紧）。首页导入卡片的标题。
- **Headline**（700，22px，行高 1.4）。对话框标题。
- **Source**（600，默认 25px 可调，行高 2，居中）。原文。行高给得很大，留出光标浮起、放大和词组标线的空间。
- **Translation**（500，默认 25px 可调，行高 1.6，左对齐）。译文输入区。比原文轻一档，让原文是「看的」，译文是「写的」。
- **Body**（400，15px，行高 1.7）。对话框正文和说明。
- **Title**（650，14px）。设置面板的分区标题。
- **Label**（600，12px）。进度标签、快捷键说明、小字。

### Named Rules
**原文重于译文规则。** 原文和译文同字号，原文永远比译文重一档字重。

## Layout

全屏白底，没有常驻的侧栏或顶栏。句子卡片居中，最大宽度 1200px，两侧留 32px。工具栏贴在左上和右上角，距边 24px；设置、词干、上一句下一句贴在底部三处，距边 32px。进度条是页面最顶端一条 6px 的蓝线，进度数字在顶部正中的白色胶囊里。

窗口窄于 760px 时，边距收到 16px、20px，工具栏只留图标。窗口矮于 640px 时，边距再收一档。卡片本身在里面滚动，页面不滚。

## Elevation & Depth

靠阴影分层，不靠颜色分层。所有东西底色都是白，谁在上面全看影子。影子都是低浓度、大模糊的柔影，像纸片浮在纸上。蓝色按钮的影子带蓝色，看起来像在发光。

### Shadow Vocabulary
- **控件柔影**（`0 1px 3px rgba(0,0,0,0.09), 0 8px 30px rgba(0,0,0,0.055)`）。白色按钮、进度胶囊、分段选择器的滑块。
- **悬停柔影**（`0 2px 5px rgba(0,0,0,0.09), 0 12px 36px rgba(0,0,0,0.075)`）。白色按钮悬停时，同时上浮 2px。
- **面板影**（`0 16px 48px rgba(0,0,0,0.08)`）。设置面板、词干面板、非当前句的卡片。
- **卡片影**（`0 30px 70px rgba(0,0,0,0.08)`）。当前句卡片、导入卡片，全站最深最远的影子。
- **对话框影**（`0 24px 64px rgba(0,0,0,0.14)`）。对话框，最浓的一档。
- **蓝晕**（`0 10px 15px -3px` 30% 信号蓝，`0 4px 6px -4px` 22% 信号蓝）。蓝色按钮和抓取模式光标。
- **光标柔影**（`0 2px 5px rgba(0,0,0,0.13), 0 7px 18px rgba(0,0,0,0.11)`）。打字模式光标。比控件柔影深，因为它在字的尺度上，要更容易找到。

### Named Rules
**浮起规则。** 状态变化用高度表达。悬停上浮 2px 加深影子，按下回落并缩到 0.98，选中的字上浮 1px 并放大到 1.12 倍。不用描边表达选中。

## Shapes

全部是圆角矩形和胶囊，没有直角，没有描边框。圆角随尺寸增大，字 10px，控件 12px，面板 24px，卡片 32px，按钮和标签是胶囊。圆形只用于底部的上一句、下一句和设置按钮。

## Components

### Buttons
- **Shape:** 胶囊（999px），图标按钮是 52px 的正圆。
- **Primary:** 信号蓝底，白字，蓝晕。悬停变深蓝、上浮 2px、蓝晕扩大。
- **Surface:** 半透明白底带背景模糊，石墨灰字，控件柔影。悬停变纯白，字变蓝，上浮 2px，换悬停柔影。
- **Quiet:** 透明底、说明灰字，只用在关闭按钮这类最次要的位置。
- **Disabled:** 蓝色按钮禁用时退成浅灰底灰字，没有影子。

### Cursor（原文光标）
原文光标是缩到字那么大的按钮。
- **打字模式:** 白色按钮，纸白底，墨色字，光标柔影。
- **抓取模式:** 蓝色按钮，信号蓝底，白字，蓝晕。
- **两种模式下字都放大 1.12 倍并上浮 1px。** 切换时只变颜色，不变大小。
- **切换动画** 140ms，只过渡底色和影子。
- **左右留白按字号算。** 光标两侧各留约 0.18 个字宽。正文的字自带 4px 内边距，注释区的字几乎没有，所以注释区的光标另外补齐到同样的比例。

### Translation Caret（译文输入光标）
- 浏览器默认的细竖线，墨色。
- 打字模式正常闪烁。抓取模式停止闪烁、保持常亮，表示键盘这时在操作原文，抓来的词会落在这里。

### Translation Selection（译文选区）
用鼠标在译文里划出的选区，是一串蓝色按钮。
- 信号蓝底，白字，蓝晕，每一行各是一段 0.3em 的圆角。
- 浏览器自带的直角系统蓝选区被设成透明，由一层和输入框排版完全一致的影子层重画。这一层只画颜色，不占位置。
- 输入框失去焦点时选区消失，和浏览器原本的行为一致。

### Inputs / Fields
- **Style:** 译文输入区没有框、没有底色，直接写在卡片上。导入页的输入框是 24px 圆角的浅底面板，配发丝线边。
- **Focus:** 导入框获得焦点时外圈出现 2px 的淡蓝光圈；译文输入区获得焦点时没有任何变化，光标本身就是焦点提示。

### Cards / Containers
- **Corner Style:** 32px。
- **Background:** 纸白。
- **Shadow Strategy:** 当前句用卡片影，非当前句用面板影并被白雾盖住。
- **Border:** 极淡的发丝线。
- **Internal Padding:** 上下 24px，原文区和译文区各自再留 30–40px。

### Switches
- 关是浅灰槽，开是信号蓝槽，白色圆钮带一点柔影。

### Phrase Ribbons（词组标线）
原文下方的细线，标线灰。实线是确定的词组，虚线是候选，术语深蓝是跨句重复的术语。它们在字的下面，不和光标抢颜色。
- **同一个词组里只换颜色时，线不断开。** 两段在空隙里接上，颜色在空隙正中换。
- **真正要断开的地方才用小圆点**（虚实变化、换行）。圆点和它所连的线同色，不出现灰点夹在彩线中间。

## Do's and Don'ts

### Do:
- **Do** 把新控件做成白色按钮或蓝色按钮之一，沿用现有的柔影和蓝晕。
- **Do** 让同一时刻亮着的蓝色尽量少，蓝色指向下一步。
- **Do** 用上浮和影子加深表达悬停和选中。
- **Do** 原文比译文重一档字重。

### Don't:
- **Don't** 发明第三种材质。空心描边框、发光边框都算第三种（11-05 的空心蓝框被否决，原因是「所有视觉语言中的异类，而且一直存在」）。
- **Don't** 在白底文字外面加带光晕的透明框。光晕的渐变会让框里的白看起来比别处更白，像加了 HDR，配上放大还像透镜。
- **Don't** 用深蓝或浅蓝底配深色字当光标。深蓝在调色板之外，而且让闲着的状态比能触发的状态还重；浅蓝底配黑字发浑。
- **Don't** 用颜色深浅区分两个状态，要用材质区分（白对蓝）。
- **Don't** 留浏览器自带的直角控件外观（选区、原生提示框、展开箭头）。它们是全站仅有的直角和系统色。
