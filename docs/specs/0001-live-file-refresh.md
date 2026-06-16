# Spec 0001: Live File Refresh

## Status

Implemented via frontend polling

Current implementation:

- `app/src/useFileManager.ts` polls each opened file every 1.5 seconds with `read_file_content`.
- Clean documents update `content` and `savedContent` quietly.
- Dirty documents preserve local edits and store the external disk version in `externalContent`.
- Deleted or unreadable files keep in-memory content and mark the tab as `deleted`.
- The preferred Rust `notify` watcher remains a future optimization, not the current implementation.

## Problem

当前 Document 打开后，内容只在打开瞬间从磁盘读取一次。若同一个文件被外部工具修改，已打开的 tab 不会跟随变化，Preview Pane 和 Source Pane 都会继续展示旧内容。用户需要把应用当作 Markdown 查看器使用时，这会造成明显困惑：磁盘上的文档已经变了，但应用没有任何反馈。

## Goals

- 当已打开 Document 的磁盘内容发生变化时，应用能发现变化。
- 对未编辑的 Document 自动刷新内容，并保持用户大致阅读位置。
- 对已有未保存修改的 Document 不自动覆盖用户编辑，而是给出明确提示和可控操作。
- 多 tab 场景下，每个已打开文件独立处理外部变化。

## Non-goals

- 不做多人协作或实时合并。
- 不监听未打开文件的变化。
- 不实现逐字符 diff 视图。
- 不要求跨设备同步。

## User Stories

1. As a reader, I want the Preview Pane to update when another program changes the opened Document, so that I always see the latest content.
2. As an editor, I want my unsaved edits protected when the file changes on disk, so that external updates do not overwrite my work silently.
3. As a multi-tab user, I want only the affected tab to refresh or warn, so that unrelated Documents stay undisturbed.

## Proposed Behavior

### Clean Document

If `content === savedContent` and the file changes on disk:

- Re-read the file from disk.
- Set both `content` and `savedContent` to the new disk content.
- Keep `isDirty` false.
- Preserve the current scroll position as closely as possible.
- Re-render Preview Pane and TOC automatically.

### Dirty Document

If `content !== savedContent` and the file changes on disk:

- Do not replace `content`.
- Mark the tab as having an external update pending.
- Show a non-blocking banner in the toolbar or tab area:
  - "磁盘上的文件已更新"
  - Actions: `重新载入`, `保留当前编辑`
- `重新载入` discards unsaved local edits after confirmation.
- `保留当前编辑` dismisses the warning for the current disk version and keeps the tab dirty.

### Deleted or Inaccessible File

If the watched file is deleted, moved, or no longer readable:

- Do not close the tab.
- Keep current in-memory content.
- Show a warning state: "文件已不存在或无法读取"。
- Saving should follow existing save behavior where possible. If writing to the original path fails, show an error and offer Save As in a later enhancement.

## Implementation Notes

Preferred future approach:

- Add a Tauri-side file watcher using the Rust `notify` crate.
- Expose commands:
  - `watch_file(path: String, tab_id: String)`
  - `unwatch_file(tab_id: String)`
  - optionally `unwatch_all_files()`
- Emit frontend events such as `file-changed`, `file-deleted`, and `file-watch-error`.
- In `useFileManager`, store watcher metadata per tab:
  - `lastKnownDiskContent` or reuse `savedContent`
  - `externalChangeState: "none" | "changed" | "deleted" | "error"`
- Start watching when a tab receives a `filePath`.
- Stop watching when a tab closes or changes path.
- Debounce duplicate watcher events, because editors often save via temp file + rename.

Fallback approach:

- Poll `metadata.modified` every 1-2 seconds for each opened file.
- Use this only if watcher behavior is unreliable in packaged macOS builds.

Current approach:

- Poll `read_file_content` every 1.5 seconds for each opened file.
- This avoids watcher packaging complexity and still satisfies the product behavior for small numbers of open Markdown files.
- If performance becomes an issue with many open tabs or very large files, replace this with the preferred Rust watcher backend.

## UX Details

- Clean auto-refresh should feel quiet: no modal, no focus stealing.
- Dirty conflict should be visible but not blocking. A compact banner is enough.
- Tab label may show a subtle external-change marker, but it must not be confused with the existing dirty `●`.
- External refresh should not reset expanded directories in the file explorer.

## Acceptance Criteria

- Given an open clean Document, when the file is modified externally, the Source Pane content updates without manual reopen.
- Given an open clean Document in Preview Mode, when the file is modified externally, the Preview Pane updates and remains in Preview Mode.
- Given an open dirty Document, when the file is modified externally, local edits remain untouched and the user sees an external-update warning.
- Given two tabs open, when one file changes externally, only that tab updates or warns.
- Given a changed file emits multiple filesystem events, the app refreshes at most once per save burst.
- Given an open file is deleted externally, the tab stays open and shows a readable warning state.

## Test Plan

- Unit-test tab state transitions in `useFileManager`-level helpers if extracted.
- Add a frontend test for clean external refresh updating `content` and `savedContent`.
- Add a frontend test for dirty external refresh preserving `content` and marking conflict state.
- Manual Tauri test:
  1. Open a `.md` file.
  2. Modify it from another editor.
  3. Confirm Preview Pane updates.
  4. Make unsaved edits in the app.
  5. Modify the disk file again.
  6. Confirm warning appears and local edits remain.
