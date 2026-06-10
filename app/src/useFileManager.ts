import { useState, useCallback, useEffect, useRef } from "react";
import { open, save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";

export interface TabState {
  id: string;
  filePath: string | null;
  content: string;
  savedContent: string;
  scrollPosition: number; // Save scroll position for each tab
}

let nextTabId = 1;
function generateTabId(): string {
  return `tab-${nextTabId++}`;
}

function createEmptyTab(): TabState {
  return { id: generateTabId(), filePath: null, content: "", savedContent: "", scrollPosition: 0 };
}

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
          updateActiveTab({ filePath: path, content: text, savedContent: text, scrollPosition: 0 });
          return true; // New file loaded
        } else {
          const newTab: TabState = {
            id: generateTabId(),
            filePath: path,
            content: text,
            savedContent: text,
            scrollPosition: 0,
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
    const unlisten = listen<string>("file-opened", (event) => {
      loadFileInNewTab(event.payload);
    });
    return () => { unlisten.then((fn) => fn()); };
  }, [loadFileInNewTab]);

  const openFile = useCallback(async () => {
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
    if (!filePath) {
      const path = await save({
        filters: [{ name: "Markdown", extensions: ["md", "markdown"] }],
      });
      if (path) {
        await writeTextFile(path, content);
        updateActiveTab({ filePath: path, savedContent: content });
      }
    } else {
      await writeTextFile(filePath, content);
      updateActiveTab({ savedContent: content });
    }
  }, [filePath, content, updateActiveTab]);

  const closeTab = useCallback(
    (tabId: string) => {
      setTabs((prev) => {
        if (prev.length === 1) {
          const newTab = createEmptyTab();
          setActiveTabId(newTab.id);
          return [newTab];
        }
        const filtered = prev.filter((t) => t.id !== tabId);
        if (activeTabId === tabId) {
          const closedIndex = prev.findIndex((t) => t.id === tabId);
          const nextIndex = Math.min(closedIndex, filtered.length - 1);
          setActiveTabId(filtered[nextIndex].id);
        }
        return filtered;
      });
    },
    [activeTabId]
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
        closeTab(activeTabId);
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
    openFile,
    saveFile,
    closeTab,
    moveTab,
    saveScrollPosition,
    loadFileInNewTab,
  };
}
