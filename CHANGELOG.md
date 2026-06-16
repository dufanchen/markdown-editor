# Changelog

本项目所有值得记录的版本变更都记录在此文件中。

格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [0.4.2] - 2026-06-16

### 修复
- 补齐外部文件刷新和关闭标签页逻辑的纯函数测试，覆盖干净文档刷新、脏文档冲突、文件不可读和 active tab 选择
- 将产品 PRD 更新到当前实现范围，补上多文档 tab、文件目录、文档搜索、外部刷新和最后 tab 关闭窗口
- 将 live file refresh、in-document search、close app on last tab specs 从 Draft 更新为当前实现状态
- 明确 live file refresh 当前采用 frontend polling，Rust `notify` watcher 作为未来优化保留

## [0.4.1] - 2026-06-16

### 修复
- 修复预览区滚动会被文件轮询拉回顶部的问题
- 修复文档内搜索跳转不稳定、预览区高亮缺失和滚动乱跳的问题
- 修复左侧文件目录点击上级目录后会立刻跳回当前文件夹的问题
- 修复最后一个标签页无法通过 `Cmd+W` 或标签页叉按钮关闭整个应用的问题

## [0.4.0] - 2026-06-15

### 新增
- 当前文档内搜索：右上角搜索框、命中计数、上下跳转、`Cmd+F` 快捷键和高亮展示
- 已打开文档跟随磁盘内容变化：干净文档自动刷新，未保存编辑时提示重新载入或保留当前编辑
- 关闭最后一个标签页时关闭应用窗口，不再生成新的 Untitled 空白文档

### 变更
- 整理项目目录：工程实现集中在 `app/`，产品文档、spec、ADR 和素材集中在 `docs/`
- 更新工程 README 和文档索引，新增功能开发先写 spec 的工作流
- ESLint 忽略 Tauri 构建产物，并调整不适合当前手动滚动同步实现的 React Hooks 检查规则

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

[0.4.2]: https://github.com/dufanchen/markdown-editor/releases/tag/v0.4.2
[0.4.1]: https://github.com/dufanchen/markdown-editor/releases/tag/v0.4.1
[0.4.0]: https://github.com/dufanchen/markdown-editor/releases/tag/v0.4.0
[0.3.0]: https://github.com/dufanchen/markdown-editor/releases/tag/v0.3.0
[0.2.0]: https://github.com/dufanchen/markdown-editor/releases/tag/v0.2.0
[0.1.0]: https://github.com/dufanchen/markdown-editor/releases/tag/v0.1.0
