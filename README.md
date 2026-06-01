# Markdown Editor

一款轻量、免费、美观的 macOS Markdown 文件查看与编辑工具。基于 Tauri + React 构建，原生性能，极低资源占用。

## 功能特性

### 📖 分栏预览
- 左侧编辑、右侧实时预览，默认 1:3 比例
- 拖拽分隔线自由调整编辑区与预览区宽度
- 双向同步滚动，编辑与预览始终对齐

### 📑 多文档标签页
- 支持同时打开多个文档，标签页切换
- 未保存的文档自动标记 ● 提示
- 关闭标签页时智能切换到相邻文档

### 🔍 字体缩放
- 工具栏提供放大/缩小按钮，5 档字体大小（特小 → 特大）
- 同时影响编辑区、预览区、目录侧栏
- 自动记忆用户选择，下次打开保持一致

### 🌓 日间 / 夜间模式
- 一键切换明暗主题，自动记忆偏好
- 暗色模式下代码块语法高亮完整适配

### 📚 目录导航
- 右侧自动提取文档标题生成树形目录
- 点击目录项平滑跳转到对应章节
- 滚动预览区时目录高亮当前位置
- 智能排除代码块中的伪标题

### ✨ Markdown 渲染
- 完整 Markdown 语法支持（标题、列表、表格、引用、代码块等）
- **代码高亮**：基于 highlight.js 的语法着色
- **数学公式**：KaTeX 渲染行内/块级公式
- **Mermaid 图表**：流程图、时序图、甘特图等
- **层级缩进**：预览区按标题层级自动缩进，竖线连接同层级内容

### 🎨 设计风格
- Monochrome (Ivory Ledger) 极简排版设计
- Jost + Lora + JetBrains Mono 字体搭配
- 选中内容双向高亮（编辑区 ↔ 预览区）

### 🔗 外部链接
- 点击 Markdown 中的外部链接，自动用系统默认浏览器打开

## 技术栈

- **框架**：[Tauri v2](https://tauri.app/) + [React](https://react.dev/) + TypeScript
- **构建**：Vite
- **渲染**：markdown-it + highlight.js + KaTeX + Mermaid

## 安装

从 [Releases](https://github.com/dufanchen/markdown-editor/releases) 下载最新的 `.dmg` 文件，打开后拖入 Applications 即可。

## 本地开发

```bash
cd app
npm install
npm run tauri dev
```

## 构建

```bash
cd app
npm run tauri build
```

构建产物位于 `app/src-tauri/target/release/bundle/` 目录下。

## License

MIT
