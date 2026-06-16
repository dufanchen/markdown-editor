# Spec 0002: In-document Search

## Status

Implemented

Current implementation:

- `App.tsx` owns `searchQuery`, `activeSearchIndex`, and search navigation state.
- `findTextMatches(content, query)` performs case-insensitive non-overlapping source matching.
- Preview search wraps rendered text nodes with `mark.search-highlight` and `mark.search-highlight-active`.
- Source search uses the textarea selection APIs when Source Pane is visible.
- `Cmd+F`, `Escape`, `Enter`, and `Shift+Enter` are wired in the UI.

## Problem

当前应用有目录导航，但没有在当前 Document 内搜索正文的入口。用户打开长 Markdown 文档后，只能依靠浏览器/WebView 默认查找能力或手动滚动，无法在应用界面内看到命中数量、当前命中位置，也不能用上下按钮逐个预览命中内容。

## Goals

- 在右上角增加当前 Document 搜索框。
- 输入查询后，在当前文件内容中查找命中。
- 有命中时默认跳到第一个命中位置。
- 高亮展示所有命中，并突出当前命中。
- 搜索框旁边提供上一个/下一个按钮，依次预览命中。
- 搜索状态随当前 tab 切换合理更新。

## Non-goals

- 不做跨文件全文搜索。
- 不做正则搜索。
- 不做替换功能。
- 不搜索文件名或目录树。
- 不把搜索高亮写回 Markdown 源文件。

## User Stories

1. As a reader, I want to search within the current Document, so that I can quickly find a term in a long Markdown file.
2. As a reader, I want the app to jump to the first match automatically, so that I do not need extra clicks after typing.
3. As a reader, I want previous and next controls, so that I can review each match in context.
4. As an editor, I want search highlights to be visual only, so that my Markdown content is not changed by searching.

## Proposed Behavior

### Search Entry

- Place a compact search control in the toolbar-right area before zoom/theme controls.
- Suggested controls:
  - Text input placeholder: `搜索`
  - Match counter: `0/0`, `1/8`
  - Previous button: `↑`
  - Next button: `↓`
  - Clear button may be added if it fits visually.
- Keyboard shortcuts:
  - `Cmd+F`: focus and select the search input.
  - `Escape`: clear search if input has content; otherwise blur search input.
  - `Enter`: next match.
  - `Shift+Enter`: previous match.

### Matching

- Search plain text case-insensitively by default.
- Ignore empty queries and queries containing only whitespace.
- Match against the current Document content, not file system paths.
- For rendered Preview Pane, highlight visible text nodes after Markdown rendering.
- For Source Pane, highlight matches in the existing source highlight backdrop if possible; otherwise scroll/select the active source match as a first implementation.

### Navigation

- When a non-empty query has at least one match:
  - Set current match index to `0`.
  - Scroll the Preview Pane to the first highlighted match.
  - If Source Pane is visible, also keep Source Pane near the corresponding source offset.
- Next button cycles forward through matches.
- Previous button cycles backward through matches.
- When the query changes, recompute matches and reset to the first match.
- When content changes while search is active, recompute matches and clamp current index.

### Highlighting

- All matches get a `search-highlight` mark.
- The active match additionally gets `search-highlight-active`.
- Search highlights must coexist with existing `sync-highlight` selection behavior.
- Clearing search removes only search highlights.

## Implementation Notes

Recommended frontend state:

```ts
interface SearchState {
  query: string;
  matches: Array<{
    index: number;
    start: number;
    end: number;
  }>;
  activeIndex: number;
}
```

Potential implementation path:

- Extract search matching into a pure helper, e.g. `findTextMatches(content, query)`.
- Add `searchState` to `App.tsx` or a dedicated `useDocumentSearch` hook.
- Recompute matches from `content` and `query`.
- After `renderedHtml` changes, walk Preview Pane text nodes and wrap matches with `<mark>`.
- Store active preview mark refs via `data-search-index`.
- Navigate by calling `scrollIntoView({ block: "center" })` on the active mark inside `previewPaneRef`.
- For Source Pane, use textarea selection APIs:
  - `source.setSelectionRange(start, end)`
  - `source.focus({ preventScroll: true })` only when the user is actively using search
  - adjust `source.scrollTop` based on line count if needed.

Important detail:

- Since Preview Pane HTML is generated from Markdown and may not map one-to-one to source offsets, the first version can treat preview highlighting and source selection separately:
  - source navigation uses raw content offsets
  - preview highlighting uses visible rendered text order
- If exact Markdown-to-preview offset mapping becomes necessary, handle it in a later spec.

## UX Details

- The search control should stay compact and not push core toolbar actions off screen.
- Buttons should be disabled when there are no matches.
- No-match state should be visible through counter `0/0` and a subtle input style, not a modal.
- Search should not steal focus while the user is typing in the Source Pane unless they press `Cmd+F` or click the search box.
- Search highlights should have sufficient contrast in light and dark themes.

## Acceptance Criteria

- Pressing `Cmd+F` focuses the search input.
- Typing a query with matches jumps to the first match and shows `1/N`.
- All matches in the Preview Pane are highlighted.
- The current match has a stronger highlight than the other matches.
- Clicking next/previous cycles through matches and scrolls the active match into view.
- Pressing Enter and Shift+Enter in the search input trigger next/previous.
- Clearing the query removes all search highlights and resets the counter.
- Switching tabs updates the search result to the newly active Document.
- Editing content while a search query is active updates match count and highlights.

## Test Plan

- Unit-test pure matching helper:
  - empty query returns no matches
  - case-insensitive matching
  - multiple matches
  - overlapping behavior is explicitly non-overlapping
- Component or integration test for search state if feasible.
- Manual test with:
  1. A long Markdown document with repeated Chinese and English terms.
  2. Source Pane visible.
  3. Preview Mode.
  4. Light and dark themes.
