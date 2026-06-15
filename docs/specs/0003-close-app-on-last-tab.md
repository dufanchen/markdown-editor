# Spec 0003: Close App on Last Tab Close

## Status

Draft

## Problem

当前关闭 tab 时，如果只剩最后一个 tab，应用不会关闭窗口，而是创建一个新的空白 Document。这个行为会让用户感觉“关闭”没有真正发生：最后一个文档已经关闭了，但窗口仍然停留在一个 Untitled 空文件状态。

对于以查看/编辑本地 Markdown 文件为主的轻量桌面应用来说，关闭最后一个 tab 更符合用户预期的行为是退出整个应用窗口。

## Goals

- 当用户关闭最后一个 tab 时，默认关闭整个应用。
- 保留多 tab 场景下现有的关闭行为：关闭当前 tab 后切换到相邻 tab。
- 如果最后一个 tab 有未保存修改，必须先保护用户内容。
- `Cmd+W` 和点击 tab 关闭按钮的行为保持一致。

## Non-goals

- 不新增“新建文件”功能。
- 不新增关闭后保留空窗口的偏好设置。
- 不改变打开文件、保存文件或拖拽排序逻辑。
- 不实现 macOS 多窗口管理。

## User Stories

1. As a user, I want closing the final tab to close the app window, so that close means close.
2. As a user, I want unsaved changes to be protected before the app closes, so that I do not lose edits accidentally.
3. As a multi-tab user, I want closing one tab among many to keep working as it does today, so that the feature does not disrupt existing tab workflows.

## Proposed Behavior

### Multiple Tabs

If `tabs.length > 1`:

- Closing a tab removes only that tab.
- If the closed tab is active, activate the nearest next tab.
- This matches the existing behavior.

### Last Clean Tab

If `tabs.length === 1` and the tab is clean:

- Close the application window.
- Do not create a replacement empty tab.
- Do not show an intermediate Untitled Document.

### Last Dirty Tab

If `tabs.length === 1` and the tab is dirty:

- Ask the user to confirm before closing.
- Recommended choices:
  - `保存`
  - `不保存`
  - `取消`
- `保存`: save current Document, then close the app if save succeeds.
- `不保存`: close the app without saving.
- `取消`: keep the app open and keep the tab unchanged.

### Dirty Tab Among Multiple Tabs

This spec recommends the same protection for dirty tabs even when more than one tab remains, but implementation may stage this separately if needed:

- Closing a dirty tab should ask before discarding unsaved edits.
- Closing a clean tab should remain immediate.

## Implementation Notes

Current location:

- `app/src/useFileManager.ts`
- `closeTab(tabId: string)` currently calls `createEmptyTab()` when `prev.length === 1`.

Recommended implementation:

- Replace the final-tab fallback with an app-close command.
- In Tauri v2 frontend code, closing the current window can use `getCurrentWindow().close()` from `@tauri-apps/api/window`.
- Because dirty-state confirmation needs async UI, consider changing `closeTab` from a purely synchronous state update to an async function:

```ts
const closeTab = useCallback(async (tabId: string) => {
  const tab = tabs.find((item) => item.id === tabId);
  if (!tab) return;

  if (tab.content !== tab.savedContent) {
    // confirm save / discard / cancel
  }

  if (tabs.length === 1) {
    await getCurrentWindow().close();
    return;
  }

  // existing remove-tab behavior
}, [tabs, activeTabId]);
```

Implementation detail:

- Avoid calling `setTabs` to create a new tab before closing the window.
- Ensure `Cmd+W` awaits or triggers the same `closeTab(activeTabId)` logic.
- If window close fails, keep the current tab state unchanged.
- If save fails during dirty close, keep the app open and surface the save error.

## UX Details

- Closing the final clean tab should feel instant.
- Dirty confirmation should use native dialog styling if available.
- Button labels should be short and explicit in Chinese.
- The app should not briefly flash an empty Untitled tab before closing.

## Acceptance Criteria

- Given only one clean tab is open, clicking its close button closes the app window.
- Given only one clean tab is open, pressing `Cmd+W` closes the app window.
- Given two tabs are open, closing one tab leaves the other tab open.
- Given the active tab among multiple tabs is closed, the next nearest tab becomes active.
- Given only one dirty tab is open, closing it asks for confirmation before app close.
- Given the user cancels dirty-tab confirmation, the app remains open and content is unchanged.
- Given the user saves from dirty-tab confirmation and save succeeds, the app closes.
- Given the user chooses not to save from dirty-tab confirmation, the app closes.

## Test Plan

- Unit-test close-tab decision logic if extracted into a pure helper:
  - multiple clean tabs
  - last clean tab
  - last dirty tab with save/cancel/discard outcomes
- Manual Tauri test:
  1. Open one file, keep it clean, close tab, confirm app closes.
  2. Open one file, edit it, close tab, confirm dirty prompt appears.
  3. Cancel the prompt, confirm tab remains.
  4. Open two files, close one, confirm the other remains active.
  5. Press `Cmd+W` in both one-tab and multi-tab states.
