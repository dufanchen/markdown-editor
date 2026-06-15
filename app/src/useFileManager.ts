import { useState, useCallback, useEffect, useRef } from "react";
import { message, open, save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";

export interface TabState {
  id: string;
  filePath: string | null;
  content: string;
  savedContent: string;
  scrollPosition: number; // Save scroll position for each tab
  externalChangeState: "none" | "changed" | "deleted" | "error";
  externalContent: string | null;
}

let nextTabId = 1;
function generateTabId(): string {
  return `tab-${nextTabId++}`;
}

function createEmptyTab(): TabState {
  return {
    id: generateTabId(),
    filePath: null,
    content: "",
    savedContent: "",
    scrollPosition: 0,
    externalChangeState: "none",
    externalContent: null,
  };
}

function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

type DirtyCloseAction = "save" | "discard" | "cancel";

export function useFileManager() {
  const [tabs, setTabs] = useState<TabState[]>([createEmptyTab()]);
  const [activeTabId, setActiveTabId] = useState<string>(tabs[0].id);
  const initialized = useRef(false);

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];
  const content = activeTab.content;
  const filePath = activeTab.filePath;
  const isDirty = activeTab.content !== activeTab.savedContent;

  const updateActiveTab = useCallback(
    (patch: Partial<TabState>) => {
      setTabs((prev) =>
        prev.map((tab) => (tab.id === activeTabId ? { ...tab, ...patch } : tab))
      );
    },
    [activeTabId]
  );

  const setContent = useCallback(
    (newContent: string) => updateActiveTab({ content: newContent }),
    [updateActiveTab]
  );

  const loadFileInNewTab = useCallback(
    async (path: string) => {
      try {
        // If file is already open, switch to that tab (do NOT scroll to top)
        const existingTab = tabs.find((t) => t.filePath === path);
        if (existingTab) {
          setActiveTabId(existingTab.id);
          return false; // Not a new file
        }
        const text = await invoke<string>("read_file_content", { path });
        // If the current tab is empty and unmodified, reuse it
        if (!activeTab.filePath && activeTab.content === "" && activeTab.savedContent === "") {
          updateActiveTab({
            filePath: path,
            content: text,
            savedContent: text,
            scrollPosition: 0,
            externalChangeState: "none",
            externalContent: null,
          });
          return true; // New file loaded
        } else {
          const newTab: TabState = {
            id: generateTabId(),
            filePath: path,
            content: text,
            savedContent: text,
            scrollPosition: 0,
            externalChangeState: "none",
            externalContent: null,
          };
          setTabs((prev) => [...prev, newTab]);
          setActiveTabId(newTab.id);
          return true; // New file loaded
        }
      } catch (error) {
        console.error("Failed to read file:", path, error);
        return false;
      }
    },
    [tabs, activeTab, updateActiveTab]
  );

  // Poll for file opened via OS association on startup
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    if (!isTauriRuntime()) return;
    let attempts = 0;
    const poll = () => {
      invoke<string | null>("get_opened_file").then((path) => {
        if (path) {
          loadFileInNewTab(path);
        } else if (attempts < 10) {
          attempts++;
          setTimeout(poll, 300);
        }
      });
    };
    poll();
  }, [loadFileInNewTab]);

  // Listen for files opened while app is running
  useEffect(() => {
    if (!isTauriRuntime()) return;
    const unlisten = listen<string>("file-opened", (event) => {
      loadFileInNewTab(event.payload);
    });
    return () => { unlisten.then((fn) => fn()); };
  }, [loadFileInNewTab]);

  const openFile = useCallback(async () => {
    if (!isTauriRuntime()) return false;
    const selected = await open({
      multiple: false,
      filters: [{ name: "Markdown", extensions: ["md", "markdown", "txt"] }],
    });
    if (selected) {
      return await loadFileInNewTab(selected as string);
    }
    return false;
  }, [loadFileInNewTab]);

  const saveFile = useCallback(async () => {
    if (!isTauriRuntime()) return;
    if (!filePath) {
      const path = await save({
        filters: [{ name: "Markdown", extensions: ["md", "markdown"] }],
      });
      if (path) {
        await writeTextFile(path, content);
        updateActiveTab({
          filePath: path,
          savedContent: content,
          externalChangeState: "none",
          externalContent: null,
        });
      }
    } else {
      await writeTextFile(filePath, content);
      updateActiveTab({ savedContent: content, externalChangeState: "none", externalContent: null });
    }
  }, [filePath, content, updateActiveTab]);

  const saveTab = useCallback(async (tab: TabState) => {
    if (!isTauriRuntime()) return false;
    try {
      if (!tab.filePath) {
        const path = await save({
          filters: [{ name: "Markdown", extensions: ["md", "markdown"] }],
        });
        if (!path) return false;
        await writeTextFile(path, tab.content);
        setTabs((prev) =>
          prev.map((current) =>
            current.id === tab.id
              ? {
                  ...current,
                  filePath: path,
                  savedContent: tab.content,
                  externalChangeState: "none",
                  externalContent: null,
                }
              : current
          )
        );
        return true;
      }

      await writeTextFile(tab.filePath, tab.content);
      setTabs((prev) =>
        prev.map((current) =>
          current.id === tab.id
            ? {
                ...current,
                savedContent: tab.content,
                externalChangeState: "none",
                externalContent: null,
              }
            : current
        )
      );
      return true;
    } catch (error) {
      console.error("Failed to save tab before closing:", error);
      await message("保存失败，文档已保留在当前窗口中。", {
        title: "保存失败",
        kind: "error",
      });
      return false;
    }
  }, []);

  const getDirtyCloseAction = useCallback(async (): Promise<DirtyCloseAction> => {
    if (!isTauriRuntime()) {
      return window.confirm("当前文档有未保存修改。关闭会丢失这些修改，是否继续关闭？")
        ? "discard"
        : "cancel";
    }

    const result = await message("当前文档有未保存修改。关闭前要保存吗？", {
      title: "关闭文档",
      kind: "warning",
      buttons: { yes: "保存", no: "不保存", cancel: "取消" },
    });

    if (result === "保存" || result === "Yes") return "save";
    if (result === "不保存" || result === "No") return "discard";
    return "cancel";
  }, []);

  const closeCurrentWindow = useCallback(async () => {
    if (isTauriRuntime()) {
      await invoke("close_current_window");
      return;
    }
    window.close();
  }, []);

  const reloadExternalContent = useCallback((tabId: string) => {
    setTabs((prev) =>
      prev.map((tab) => {
        if (tab.id !== tabId || tab.externalContent === null) return tab;
        return {
          ...tab,
          content: tab.externalContent,
          savedContent: tab.externalContent,
          externalChangeState: "none",
          externalContent: null,
        };
      })
    );
  }, []);

  const dismissExternalChange = useCallback((tabId: string) => {
    setTabs((prev) =>
      prev.map((tab) =>
        tab.id === tabId
          ? {
              ...tab,
              savedContent: tab.externalContent ?? tab.savedContent,
              externalChangeState: "none",
              externalContent: null,
            }
          : tab
      )
    );
  }, []);

  useEffect(() => {
    if (!isTauriRuntime()) return;
    const intervalId = window.setInterval(() => {
      tabs.forEach((tab) => {
        if (!tab.filePath || tab.externalChangeState !== "none") return;
        invoke<string>("read_file_content", { path: tab.filePath })
          .then((diskContent) => {
            setTabs((prev) => {
              let changed = false;
              const nextTabs: TabState[] = prev.map((current) => {
                if (current.id !== tab.id || !current.filePath) return current;
                if (diskContent === current.savedContent) return current;

                const isDirty = current.content !== current.savedContent;
                if (isDirty) {
                  if (current.content === diskContent) {
                    changed = true;
                    return {
                      ...current,
                      savedContent: diskContent,
                      externalChangeState: "none",
                      externalContent: null,
                    };
                  }
                  if (
                    current.externalChangeState === "changed" &&
                    current.externalContent === diskContent
                  ) {
                    return current;
                  }
                  changed = true;
                  return {
                    ...current,
                    externalChangeState: "changed",
                    externalContent: diskContent,
                  };
                }

                changed = true;
                return {
                  ...current,
                  content: diskContent,
                  savedContent: diskContent,
                  externalChangeState: "none",
                  externalContent: null,
                };
              });
              return changed ? nextTabs : prev;
            });
          })
          .catch(() => {
            setTabs((prev) => {
              let changed = false;
              const nextTabs: TabState[] = prev.map((current) => {
                if (current.id !== tab.id) return current;
                if (current.externalChangeState === "deleted" && current.externalContent === null) {
                  return current;
                }
                changed = true;
                return { ...current, externalChangeState: "deleted", externalContent: null };
              });
              return changed ? nextTabs : prev;
            });
          });
      });
    }, 1500);

    return () => window.clearInterval(intervalId);
  }, [tabs]);

  const closeTab = useCallback(
    async (tabId: string) => {
      const tab = tabs.find((item) => item.id === tabId);
      if (!tab) return;

      if (tab.content !== tab.savedContent) {
        const action = await getDirtyCloseAction();
        if (action === "cancel") return;
        if (action === "save") {
          const saved = await saveTab(tab);
          if (!saved) return;
        }
      }

      if (tabs.length === 1) {
        await closeCurrentWindow();
        return;
      }

      setTabs((prev) => {
        const filtered = prev.filter((item) => item.id !== tabId);
        if (activeTabId === tabId) {
          const closedIndex = prev.findIndex((item) => item.id === tabId);
          const nextIndex = Math.min(closedIndex, filtered.length - 1);
          setActiveTabId(filtered[nextIndex].id);
        }
        return filtered;
      });
    },
    [activeTabId, closeCurrentWindow, getDirtyCloseAction, saveTab, tabs]
  );

  const moveTab = useCallback(
    (fromIndex: number, toIndex: number) => {
      setTabs((prev) => {
        if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || toIndex >= prev.length) {
          return prev;
        }
        const newTabs = [...prev];
        const [movedTab] = newTabs.splice(fromIndex, 1);
        newTabs.splice(toIndex, 0, movedTab);
        return newTabs;
      });
    },
    []
  );

  const saveScrollPosition = useCallback(
    (tabId: string, scrollPosition: number) => {
      setTabs((prev) =>
        prev.map((tab) =>
          tab.id === tabId ? { ...tab, scrollPosition } : tab
        )
      );
    },
    []
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "s") {
        event.preventDefault();
        saveFile();
      }
      if ((event.metaKey || event.ctrlKey) && event.key === "o") {
        event.preventDefault();
        openFile();
      }
      if ((event.metaKey || event.ctrlKey) && event.key === "w") {
        event.preventDefault();
        void closeTab(activeTabId);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [saveFile, openFile, closeTab, activeTabId]);

  return {
    tabs,
    activeTabId,
    setActiveTabId,
    content,
    setContent,
    filePath,
    isDirty,
    activeTab,
    openFile,
    saveFile,
    closeTab,
    moveTab,
    saveScrollPosition,
    loadFileInNewTab,
    reloadExternalContent,
    dismissExternalChange,
  };
}
