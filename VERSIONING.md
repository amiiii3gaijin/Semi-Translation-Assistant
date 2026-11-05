# 半翻版本记录与回退

版本号以 package.json 为准，release-history.json 保存每次更新说明。首页显示版本、源码构建标识，并与同一网站的 version.json 核对；“一致”仅表示与当前部署一致，不代表已核对 GitHub 或其他网站。无法联网时明确显示无法核对。不会自动刷新正在编辑的页面。

## 本机归档

本次开始正式编号：0.1.0 是修改前的基线，0.2.0 是右 Alt 开关和注释布局更新。旧版本日期是归档日期，不伪造过去的发布日期。

- 修改前基线：local-only/releases/0.1.0-before-capture-toggle/source.zip。
- 新版本：运行 npm run build，再运行 npm run release:snapshot。
- 快照位于 local-only/releases/版本号-构建标识-归档编号/，含 source 源码、manifest.json 校验清单，以及构建标识匹配时的 website 可部署网页。只有存在 manifest.json 且 complete 为 true 才是完整快照；无清单的中断副本不可用于回退。
- 快照不包含 node_modules、真实 .env、缓存或浏览器里的译文；不要把它们当成译文备份。

## 回退

1. 先在网页导出当前译文，并保留完整原文及 LLM 回复。应用快照不保证旧程序能读取未来版本的浏览器数据。
2. 将目标快照的 source（或基线 source.zip）复制/解压到一个新的空目录，不覆盖当前项目。
3. 在新目录运行 npm ci，然后 npm run dev。关闭当前本地服务后才复用 3000 端口；不同端口不会共享原有浏览器工作区。
4. 若回退线上网站，部署目标快照 website 的全部内容，不要混合不同版本文件。基线仅有源码，需要重新构建。

## 后续发布

先归档当前版本，修改后同步 package.json、package-lock.json 和 release-history.json 的版本号，再做检查、构建、快照。网页版本清单与源码标识由构建自动生成。上传 GitHub 保留源码、锁文件、版本历史及本文档；不上传 local-only、node_modules、.npm-cache、dist 和真实 .env。部署平台应将 version.json 设置为不长期缓存。
