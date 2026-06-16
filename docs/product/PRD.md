## Problem Statement

Mac 用户需要一个轻量级工具来快速查看 .md 文件的渲染效果，并在需要时进行简单编辑。现有方案要么过重（VS Code 需要打开整个编辑器）、要么体验粗糙（GitHub 预览无法编辑）、要么收费（Typora）。用户需要一个免费、启动快、渲染精致的 Markdown 查看/编辑工具。

## Solution

一个基于 Tauri + React 的 Mac 桌面应用。默认以预览阅读为中心，左侧源码 textarea 可按需展开进入 Split Mode。支持所有主流 Markdown 扩展语法的渲染，支持浅色/深色主题跟随系统切换，通过 Cmd+S 手动保存。当前版本已经支持多文档 tab、IDE-style 文件目录、当前文档内搜索、外部文件变更刷新/冲突提示，以及关闭最后一个 tab 时关闭窗口。

## User Stories

1. As a user, I want to open a .md file via system file dialog, so that I can quickly view its rendered content.
2. As a user, I want to see the Markdown rendered with Typora-level styling, so that the reading experience is pleasant and professional.
3. As a user, I want to see code blocks with syntax highlighting, so that code snippets are easy to read.
4. As a user, I want to see LaTeX math formulas rendered correctly (both inline and block), so that technical documents display properly.
5. As a user, I want to see Mermaid diagrams rendered as actual charts, so that flowcharts and sequence diagrams are visual.
6. As a user, I want to see GFM tables rendered as styled HTML tables, so that tabular data is readable.
7. As a user, I want to see task lists with checkboxes, so that TODO items are visually distinct.
8. As a user, I want to see local images displayed in the preview, so that documents with images render completely.
9. As a user, I want to see footnotes rendered with proper numbering and links, so that references are navigable.
10. As a user, I want to see an auto-generated Table of Contents, so that I can understand document structure at a glance.
11. As a user, I want to edit the raw Markdown in a textarea on the left pane, so that I can make quick changes.
12. As a user, I want the preview to update in real-time as I type, so that I can see the effect of my changes immediately.
13. As a user, I want to collapse the source pane to enter Preview Mode, so that I can focus on reading without distraction.
14. As a user, I want to expand the source pane back to Split Mode, so that I can resume editing.
15. As a user, I want to save my changes with Cmd+S, so that I can persist edits to disk.
16. As a user, I want to see a visual indicator when the document has unsaved changes, so that I don't accidentally close without saving.
17. As a user, I want the app to follow my system dark/light mode preference, so that it matches my desktop environment.
18. As a user, I want to manually toggle between light and dark theme, so that I can override the system setting if needed.
19. As a user, I want the app to start quickly and feel lightweight, so that it doesn't slow down my workflow.
20. As a user, I want to drag and drop a .md file onto the app window to open it, so that file opening is frictionless.
21. As a user, I want to be warned before closing with unsaved changes, so that I don't lose work.
22. As a user, I want to keep several Markdown documents open in tabs, so that I can compare or switch between files quickly.
23. As a user, I want to browse a local folder from a file tree, so that opening nearby Markdown files is quick.
24. As a user, I want the current document to refresh or warn when the disk file changes externally, so that the preview stays trustworthy without overwriting my edits.
25. As a user, I want to search inside the current document, so that long Markdown files are navigable.
26. As a user, I want closing the final tab to close the app window, so that close means close.

## Implementation Decisions

- **Runtime**: Tauri v2 for the native shell, React for the frontend UI.
- **Markdown Rendering Pipeline**: `markdown-it` as the core parser, extended with plugins:
  - `markdown-it-highlightjs` (v4.3+) for code block syntax highlighting via highlight.js
  - `@traptitech/markdown-it-katex` for LaTeX math rendering (the original `markdown-it-katex` is deprecated; this fork supports KaTeX v0.16+)
  - Mermaid diagrams via custom fence renderer: register a markdown-it fence rule for `mermaid` language blocks, render the raw text into a `<div class="mermaid">` container, then initialize with `mermaid.run()` after DOM mount
  - `markdown-it-footnote` for footnotes
  - `@mdit/plugin-tasklist` for checkbox task lists (actively maintained; the older `markdown-it-task-lists` has not been updated in 8 years)
  - `markdown-it-anchor` + `markdown-it-toc-done-right` for heading anchors and TOC generation (both required together; anchor adds IDs to headings, toc-done-right generates the navigation list)
- **Editor**: Plain HTML `<textarea>` — no CodeMirror or rich editor. Complexity stays in Preview Pane.
- **Layout Architecture**: A React component tree with a resizable split layout. Source Pane visibility controlled by a single boolean state. CSS transition for smooth collapse/expand animation.
- **Theme System**: CSS custom properties (variables) for all colors. Two theme files (light/dark). Detection via `window.matchMedia('(prefers-color-scheme: dark)')` with manual override stored in localStorage.
- **File I/O**: Tauri's `dialog` and `fs` APIs for native open/save dialogs and file read/write. A Rust command lists directory entries for the file tree. Local images resolved via Tauri's `convertFileSrc` for asset protocol URLs.
- **Dirty State**: A simple `isDirty` flag comparing current textarea content against last-saved content. Title bar shows dot indicator when dirty. `beforeunload` event triggers confirmation dialog.
- **External Refresh**: Open files are checked from the frontend on a short polling interval. Clean tabs update quietly; dirty tabs keep local content and store the external version for explicit user action.
- **Tabs**: Each open document has independent file path, content, saved content, scroll position, and external-change state. Closing the last clean tab closes the app window; dirty tabs prompt before closing.
- **Styling**: Custom CSS inspired by Typora's aesthetic — generous whitespace, elegant typography (system font stack with serif headings option), subtle borders, smooth transitions.

## Testing Decisions

- **What makes a good test**: Tests should verify external behavior (given Markdown input → expected HTML output), not internal implementation details of the rendering pipeline.
- **Module to test**: Preview Pane rendering logic — a pure function `renderMarkdown(source: string): string` that can be tested in isolation without DOM.
- **Test coverage targets**:
  - Standard Markdown (headings, paragraphs, lists, links, images, blockquotes)
  - GFM extensions (tables, task lists, strikethrough)
  - Code blocks with language-specific highlighting
  - LaTeX math (inline `$...$` and block `$$...$$`)
  - Mermaid code blocks producing diagram containers
  - Footnote numbering and back-references
  - TOC generation from headings
  - File/tab state transitions for external file refresh, deleted files, and close-tab active-tab selection
- **Test framework**: Vitest (fast, Vite-native, works well with Tauri+React projects).

## Out of Scope

- WYSIWYG editing in the preview pane
- Syntax highlighting in the source editor
- Export to PDF/HTML
- Plugin system or user extensions
- Cloud sync or collaboration features
- Cross-device sync, realtime collaboration, or merge/diff conflict resolution
- Native filesystem watcher backend. Current implementation uses frontend polling; Rust `notify` can replace it later if packaging/performance requires it.
- Mobile support. The product target remains desktop-first; generated icon assets may include cross-platform variants, but product validation is Mac-first.

## Further Notes

- The app name is TBD. Working title: "Markdown Editor".
- The asymmetric design (rich preview + plain editor) is a deliberate architectural decision documented in ADR-0001. This keeps scope manageable while delivering the best experience where users spend most time (reading).
- Future iterations may upgrade the textarea to CodeMirror 6 if users request syntax highlighting in the editor, but the architecture supports this swap without changes to other modules.
