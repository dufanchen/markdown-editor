# Changelog

本项目所有值得记录的版本变更都记录在此文件中。

格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [0.3.0] - 2026-06-11

### 新增
- IDE 风格树状文件目录侧边栏，竖线引导层级
- 文件夹展开/折叠，非 `.md` 文件置灰不可点击
- 目录宽度可拖拽调整
- "回到当前文件夹"快捷按钮
- 目录字体跟随全局缩放
- 从目录导航打开文件不重置已展开的目录结构
- 向上展开目录时保持已展开的子文件夹状态

### 修复
- 预览模式下选中文字松开鼠标后选区丢失

## [0.2.0] - 2026-06-04

### 新增
- 标签页支持拖拽排序，自由调整文档顺序
- 每个标签各自记忆滚动位置，切回时回到离开处

### 变更
- 不再跟踪 `.idea/vcs.xml`，避免 IDE 配置污染仓库

## [0.1.0] - 2026-06-04

首个公开版本。

### 新增
- 分栏实时预览，源码栏可折叠为纯预览模式
- 多文档标签页，未保存状态以 ● 标记
- 五档字体缩放，自动记忆偏好
- 日间 / 夜间主题切换
- 目录侧栏：自动提取标题、平滑跳转、滚动高亮
- 系统文件关联：`.md` / `.markdown` / `.mdown` / `.mkd` / `.mkdn` / `.txt`
- 完整 Markdown 渲染：代码高亮、KaTeX 公式、Mermaid 图表、任务列表、脚注、标题锚点
- 外部链接以系统默认浏览器打开
- Monochrome (Ivory Ledger) 极简排版与编辑/预览双向高亮

[0.3.0]: https://github.com/dufanchen/markdown-editor/releases/tag/v0.3.0
[0.2.0]: https://github.com/dufanchen/markdown-editor/releases/tag/v0.2.0
[0.1.0]: https://github.com/dufanchen/markdown-editor/releases/tag/v0.1.0
