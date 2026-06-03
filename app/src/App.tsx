import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { renderMarkdown } from "./renderer";
import { useTheme } from "./useTheme";
import { useFileManager } from "./useFileManager";
import mermaid from "mermaid";
import "./App.css";

interface TocNode {
  level: number;
  text: string;
  id: string;
  children: TocNode[];
}

function buildTocTree(items: { level: number; text: string; id: string }[]): TocNode[] {
  const root: TocNode[] = [];
  const stack: { node: TocNode; level: number }[] = [];

  for (const item of items) {
    const node: TocNode = { ...item, children: [] };
    while (stack.length > 0 && stack[stack.length - 1].level >= item.level) {
      stack.pop();
    }
    if (stack.length === 0) {
      root.push(node);
    } else {
      stack[stack.length - 1].node.children.push(node);
    }
    stack.push({ node, level: item.level });
  }
  return root;
}

function TocTree({ items, activeId, onItemClick }: {
  items: { level: number; text: string; id: string }[];
  activeId: string;
  onItemClick: (id: string) => void;
}) {
  const tree = useMemo(() => buildTocTree(items), [items]);

  const renderNodes = (nodes: TocNode[], depth: number) => (
    <ul className={`toc-list toc-depth-${depth}`}>
      {nodes.map((node, index) => (
        <li key={`${node.id}-${index}`} className="toc-branch">
          <div
            className={`toc-item toc-level-${node.level}${activeId === node.id ? " toc-active" : ""}`}
            onClick={() => onItemClick(node.id)}
            title={node.text}
          >
            {node.text}
          </div>
          {node.children.length > 0 && renderNodes(node.children, depth + 1)}
        </li>
      ))}
    </ul>
  );

  return <>{renderNodes(tree, 0)}</>;
}

function App() {
  const { theme, toggleTheme, zoomIn, zoomOut, canZoomIn, canZoomOut } = useTheme();
  const {
    tabs, activeTabId, setActiveTabId: setRawActiveTabId,
    content, setContent, filePath, isDirty,
    openFile: openFileFromHook, saveFile, closeTab, moveTab,
    saveScrollPosition,
  } = useFileManager();

  // Wrap setActiveTabId to save/restore scroll positions on tab switch
  const setActiveTabId = useCallback((newTabId: string) => {
    if (newTabId === activeTabId) return;
    // Save current tab's scroll position BEFORE switching.
    // In preview-only mode the textarea is unmounted, so the preview pane
    // is the element that actually scrolls. Read whichever is currently active.
    const previewScroll = previewPaneRef.current?.scrollTop ?? 0;
    const sourceScroll = sourceRef.current?.scrollTop ?? 0;
    const currentScrollPos = Math.max(previewScroll, sourceScroll);
    saveScrollPosition(activeTabId, currentScrollPos);

    // Switch tab
    setRawActiveTabId(newTabId);
  }, [activeTabId, saveScrollPosition, setRawActiveTabId]);

  // Wrap openFile to scroll to top when a new file is opened
  const openFile = useCallback(async () => {
    const result = await openFileFromHook();
    if (result === true) {
      // New file opened, scroll to top
      setTimeout(() => {
        sourceRef.current?.scrollTo({ top: 0, behavior: "auto" });
        previewPaneRef.current?.scrollTo({ top: 0, behavior: "auto" });
      }, 0);
    }
  }, [openFileFromHook]);
  const [sourceVisible, setSourceVisible] = useState(false);
  const [splitRatio, setSplitRatio] = useState(0.25);



  // Easter egg: toggle theme 20 times rapidly to open a secret file
  const themeClickTimes = useRef<number[]>([]);
  const handleThemeToggle = useCallback(() => {
    toggleTheme();
    const now = Date.now();
    themeClickTimes.current.push(now);
    // Keep only clicks within the last 8 seconds
    themeClickTimes.current = themeClickTimes.current.filter((t) => now - t < 8000);
    if (themeClickTimes.current.length >= 20) {
      themeClickTimes.current = [];
      import("@tauri-apps/api/core").then(({ invoke }) => {
        invoke<string>("read_bundled_resource", {
          filename: "easter-egg.md",
        }).then((text) => {
          setContent(text);
        });
      });
    }
  }, [toggleTheme, setContent]);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const sourceRef = useRef<HTMLTextAreaElement>(null);
  const previewPaneRef = useRef<HTMLDivElement>(null);
  const scrollSyncSource = useRef<"source" | "preview" | null>(null);

  // Tab drag-and-drop reordering via pointer events (WKWebView's native HTML5
  // drag-and-drop is unreliable, so we implement it manually).
  const [draggingTabId, setDraggingTabId] = useState<string | null>(null);
  const [dragOverTabId, setDragOverTabId] = useState<string | null>(null);
  const [dragOffsetX, setDragOffsetX] = useState(0);
  const dragStartPos = useRef<{ x: number; tabId: string } | null>(null);
  const justDraggedRef = useRef(false);

  const handleTabPointerDown = useCallback(
    (event: React.PointerEvent, tabId: string) => {
      // Only start drag tracking on the tab body, not the close button
      if ((event.target as HTMLElement).closest(".tab-close")) return;
      dragStartPos.current = { x: event.clientX, tabId };
    },
    []
  );

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const start = dragStartPos.current;
      if (!start) return;
      // Begin dragging only after a small threshold to avoid hijacking clicks
      if (!draggingTabId && Math.abs(event.clientX - start.x) < 5) return;

      if (!draggingTabId) {
        setDraggingTabId(start.tabId);
      }

      // Translate the dragged tab to follow the pointer (Chrome-like feel)
      setDragOffsetX(event.clientX - start.x);

      // Find which tab the pointer is over. The dragged tab is translated to
      // follow the pointer and sits on top, so it would always match first.
      // Skip it and look for the tab underneath instead.
      const draggedId = draggingTabId ?? start.tabId;
      const elements = document.elementsFromPoint(event.clientX, event.clientY);
      const tabEl = elements.find(
        (el) =>
          el.classList.contains("tab-item") &&
          (el as HTMLElement).dataset.tabId !== draggedId
      ) as HTMLElement | undefined;
      const overId = tabEl?.dataset.tabId ?? null;
      setDragOverTabId(overId);
    };

    const handlePointerUp = () => {
      const start = dragStartPos.current;
      if (start && draggingTabId && dragOverTabId && draggingTabId !== dragOverTabId) {
        const fromIndex = tabs.findIndex((t) => t.id === draggingTabId);
        const toIndex = tabs.findIndex((t) => t.id === dragOverTabId);
        if (fromIndex !== -1 && toIndex !== -1) {
          moveTab(fromIndex, toIndex);
        }
      }
      // Suppress the click that fires right after a drag so it doesn't
      // switch tabs unintentionally.
      if (draggingTabId) {
        justDraggedRef.current = true;
        setTimeout(() => {
          justDraggedRef.current = false;
        }, 0);
      }
      dragStartPos.current = null;
      setDraggingTabId(null);
      setDragOverTabId(null);
      setDragOffsetX(0);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [draggingTabId, dragOverTabId, tabs, moveTab]);

  const handleMouseDown = useCallback(() => {
    isDragging.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const ratio = (event.clientX - rect.left) / rect.width;
      setSplitRatio(Math.max(0.1, Math.min(0.8, ratio)));
    };
    const handleMouseUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  const scrollSyncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRestoringScroll = useRef(false);

  const handleSourceScroll = useCallback(() => {
    // Skip sync if we're programmatically restoring scroll position
    if (isRestoringScroll.current) return;

    // Sync backdrop scroll with textarea
    const source = sourceRef.current;
    if (source) {
      const backdrop = source.previousElementSibling as HTMLElement | null;
      if (backdrop?.classList.contains("source-highlight-backdrop")) {
        backdrop.scrollTop = source.scrollTop;
        backdrop.scrollLeft = source.scrollLeft;
      }
    }
    // Sync preview scroll
    if (scrollSyncSource.current === "preview") return;
    scrollSyncSource.current = "source";
    const preview = previewPaneRef.current;
    if (!source || !preview) return;
    const sourceMaxScroll = source.scrollHeight - source.clientHeight;
    if (sourceMaxScroll <= 0) return;
    const scrollRatio = source.scrollTop / sourceMaxScroll;
    const previewMaxScroll = preview.scrollHeight - preview.clientHeight;
    preview.scrollTop = scrollRatio * previewMaxScroll;
    if (scrollSyncTimer.current) clearTimeout(scrollSyncTimer.current);
    scrollSyncTimer.current = setTimeout(() => {
      scrollSyncSource.current = null;
    }, 50);
  }, []);

  const handlePreviewScroll = useCallback(() => {
    // Skip sync if we're programmatically restoring scroll position
    if (isRestoringScroll.current) return;

    if (scrollSyncSource.current === "source") return;
    scrollSyncSource.current = "preview";
    const source = sourceRef.current;
    const preview = previewPaneRef.current;
    if (!source || !preview) return;
    const previewMaxScroll = preview.scrollHeight - preview.clientHeight;
    if (previewMaxScroll <= 0) return;
    const scrollRatio = preview.scrollTop / previewMaxScroll;
    const sourceMaxScroll = source.scrollHeight - source.clientHeight;
    source.scrollTop = scrollRatio * sourceMaxScroll;
    if (scrollSyncTimer.current) clearTimeout(scrollSyncTimer.current);
    scrollSyncTimer.current = setTimeout(() => {
      scrollSyncSource.current = null;
    }, 50);
  }, []);

  // Restore scroll position when switching tabs
  useEffect(() => {
    const tab = tabs.find((t) => t.id === activeTabId);
    const savedPosition = tab?.scrollPosition ?? 0;

    isRestoringScroll.current = true;

    // The target content may render asynchronously (mermaid, katex, images),
    // so the scrollable height grows over several frames. Setting scrollTop
    // before the height is large enough makes the browser clamp it to a
    // smaller value (e.g. the previous shorter document's max). Keep retrying
    // every frame until the scroll position actually sticks at the target,
    // which only happens once the content has rendered tall enough.
    let rafId = 0;
    let attempts = 0;
    const maxAttempts = 120; // ~2s at 60fps

    const applyScroll = () => {
      const preview = previewPaneRef.current;
      const source = sourceRef.current;

      if (source) {
        source.scrollTop = savedPosition;
      }
      if (preview) {
        preview.scrollTop = savedPosition;
      }

      attempts++;

      const target = preview ?? source;
      // Success: the container accepted the full target position. While the
      // content is still too short, the browser clamps scrollTop to a smaller
      // value, so keep retrying until it stops being clamped (or we time out).
      const reached =
        savedPosition === 0 ||
        !target ||
        Math.abs(target.scrollTop - savedPosition) <= 1;

      if (reached || attempts >= maxAttempts) {
        requestAnimationFrame(() => {
          isRestoringScroll.current = false;
        });
        return;
      }
      rafId = requestAnimationFrame(applyScroll);
    };

    rafId = requestAnimationFrame(applyScroll);

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [activeTabId, tabs]);

  // Highlight selected text in the other pane
  const highlightInPreview = useCallback((selectedText: string) => {
    const preview = previewRef.current;
    if (!preview) return;
    // Remove previous highlights
    preview.querySelectorAll("mark.sync-highlight").forEach((el) => {
      const parent = el.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(el.textContent || ""), el);
        parent.normalize();
      }
    });
    if (!selectedText || selectedText.length < 2) return;
    const escapedText = selectedText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${escapedText})`, "gi");
    const walker = document.createTreeWalker(preview, NodeFilter.SHOW_TEXT);
    const textNodes: Text[] = [];
    while (walker.nextNode()) {
      textNodes.push(walker.currentNode as Text);
    }
    for (const node of textNodes) {
      if (!node.nodeValue || !regex.test(node.nodeValue)) continue;
      regex.lastIndex = 0;
      const fragment = document.createDocumentFragment();
      let lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = regex.exec(node.nodeValue)) !== null) {
        if (match.index > lastIndex) {
          fragment.appendChild(document.createTextNode(node.nodeValue.slice(lastIndex, match.index)));
        }
        const mark = document.createElement("mark");
        mark.className = "sync-highlight";
        mark.textContent = match[1];
        fragment.appendChild(mark);
        lastIndex = regex.lastIndex;
      }
      if (lastIndex < node.nodeValue.length) {
        fragment.appendChild(document.createTextNode(node.nodeValue.slice(lastIndex)));
      }
      node.parentNode?.replaceChild(fragment, node);
    }
  }, []);

  const [sourceHighlightText, setSourceHighlightText] = useState("");

  const handleSourceSelect = useCallback(() => {
    const source = sourceRef.current;
    if (!source) return;
    const selected = source.value.substring(source.selectionStart, source.selectionEnd);
    highlightInPreview(selected);
  }, [highlightInPreview]);

  const handlePreviewMouseUp = useCallback(() => {
    const selection = window.getSelection();
    const selectedText = selection?.toString() || "";
    setSourceHighlightText(selectedText.length >= 2 ? selectedText : "");
  }, []);

  // Debounced markdown rendering for editing performance
  const [renderedHtml, setRenderedHtml] = useState(() => renderMarkdown(content));
  const renderTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!sourceVisible) {
      // Not editing — render immediately
      setRenderedHtml(renderMarkdown(content));
      return;
    }
    if (renderTimer.current) clearTimeout(renderTimer.current);
    renderTimer.current = setTimeout(() => {
      setRenderedHtml(renderMarkdown(content));
    }, 150);
    return () => { if (renderTimer.current) clearTimeout(renderTimer.current); };
  }, [content, sourceVisible]);

  // Extract TOC headings from markdown content, excluding code blocks
  const tocItems = useMemo(() => {
    // Strip fenced code blocks before extracting headings
    const stripped = content.replace(/^```[\s\S]*?^```/gm, "");
    const headingRegex = /^(#{1,6})\s+(.+)$/gm;
    const items: { level: number; text: string; id: string }[] = [];
    const slugCounts: Record<string, number> = {};
    let match: RegExpExecArray | null;
    while ((match = headingRegex.exec(stripped)) !== null) {
      const level = match[1].length;
      const rawText = match[2].trim();
      const text = rawText.replace(/[*_`~\[\]()]/g, "");
      // Match markdown-it-anchor default slugify
      let slug = encodeURIComponent(
        String(text).trim().toLowerCase().replace(/\s+/g, "-")
      );
      // Handle duplicate slugs (markdown-it-anchor appends -1, -2, etc.)
      if (slugCounts[slug] !== undefined) {
        slugCounts[slug]++;
        slug = `${slug}-${slugCounts[slug]}`;
      } else {
        slugCounts[slug] = 0;
      }
      items.push({ level, text, id: slug });
    }
    return items;
  }, [content]);

  const [activeTocId, setActiveTocId] = useState("");

  // Track which heading is currently visible in the preview
  useEffect(() => {
    const previewPane = previewPaneRef.current;
    if (!previewPane || tocItems.length === 0) return;
    const handleScroll = () => {
      const headings = previewPane.querySelectorAll("h1, h2, h3, h4, h5, h6");
      const paneRect = previewPane.getBoundingClientRect();
      let currentId = "";
      for (const heading of headings) {
        const rect = heading.getBoundingClientRect();
        if (rect.top - paneRect.top <= 80) {
          currentId = heading.id;
        } else {
          break;
        }
      }
      setActiveTocId(currentId);
    };
    previewPane.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => previewPane.removeEventListener("scroll", handleScroll);
  }, [tocItems, renderedHtml]);

  const handleTocClick = useCallback((headingId: string) => {
    const previewPane = previewPaneRef.current;
    if (!previewPane) return;
    const target = previewPane.querySelector(`[id="${headingId}"]`);
    if (target) {
      const paneRect = previewPane.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      previewPane.scrollTo({
        top: previewPane.scrollTop + (targetRect.top - paneRect.top) - 20,
        behavior: "smooth",
      });
    }
  }, []);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: theme === "dark" ? "dark" : "default",
    });
  }, [theme]);

  // Open external links in system browser instead of WebView
  useEffect(() => {
    const handleLinkClick = (event: MouseEvent) => {
      const anchor = (event.target as HTMLElement).closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (href && (href.startsWith("http://") || href.startsWith("https://"))) {
        event.preventDefault();
        import("@tauri-apps/plugin-shell").then(({ open }) => open(href));
      }
    };
    document.addEventListener("click", handleLinkClick);
    return () => document.removeEventListener("click", handleLinkClick);
  }, []);

  useEffect(() => {
    if (previewRef.current) {
      const mermaidDivs = previewRef.current.querySelectorAll(".mermaid");
      if (mermaidDivs.length > 0) {
        mermaidDivs.forEach((div) => {
          div.removeAttribute("data-processed");
        });
        mermaid.run({ nodes: Array.from(mermaidDivs) as HTMLElement[] });
      }
    }
  }, [renderedHtml, theme]);

  const fileName = filePath ? filePath.split("/").pop() : "Untitled";
  const titleDisplay = `${isDirty ? "● " : ""}${fileName}`;

  useEffect(() => {
    document.title = `${titleDisplay} — Markdown Editor`;
  }, [titleDisplay]);

  return (
    <div className="app-container">
      <header className="toolbar">
        <div className="toolbar-left">
          <button className="toolbar-text-btn" onClick={openFile} title="⌘O">打开</button>
          <button className="toolbar-text-btn" onClick={saveFile} title="⌘S" disabled={!isDirty}>保存</button>
          <button
            className="toolbar-text-btn"
            onClick={() => setSourceVisible(!sourceVisible)}
          >
            {sourceVisible ? "关闭编辑" : "编辑"}
          </button>
        </div>
        <div className="toolbar-center" />
        <div className="toolbar-right">
          <button className="toolbar-text-btn" onClick={zoomOut} disabled={!canZoomOut} title="缩小字体">
            缩小
          </button>
          <button className="toolbar-text-btn" onClick={zoomIn} disabled={!canZoomIn} title="放大字体">
            放大
          </button>
          <button className="toolbar-text-btn" onClick={handleThemeToggle}>
            {theme === "dark" ? "日间" : "夜间"}
          </button>
        </div>
      </header>

      <div className="tab-bar">
        {tabs.map((tab) => {
          const tabName = tab.filePath ? tab.filePath.split("/").pop() : "Untitled";
          const tabDirty = tab.content !== tab.savedContent;
          return (
            <div
              key={tab.id}
              data-tab-id={tab.id}
              className={`tab-item${tab.id === activeTabId ? " tab-active" : ""}${
                draggingTabId === tab.id ? " tab-dragging" : ""
              }${
                dragOverTabId === tab.id && draggingTabId && draggingTabId !== tab.id
                  ? " tab-drag-over"
                  : ""
              }`}
              style={
                draggingTabId === tab.id
                  ? { transform: `translateX(${dragOffsetX}px)` }
                  : undefined
              }
              onClick={() => {
                if (justDraggedRef.current) return;
                setActiveTabId(tab.id);
              }}
              onPointerDown={(e) => handleTabPointerDown(e, tab.id)}
            >
              <span className="tab-label">{tabDirty ? "● " : ""}{tabName}</span>
              <span
                className="tab-close"
                onClick={(event) => { event.stopPropagation(); closeTab(tab.id); }}
              >
                ×
              </span>
            </div>
          );
        })}
      </div>

      <main className="editor-container" ref={containerRef}>
        {sourceVisible && (
          <>
            <div className="source-pane" style={{ width: `${splitRatio * 100}%` }}>
              <div className="source-wrapper">
                {sourceHighlightText && (
                  <div
                    className="source-highlight-backdrop"
                    aria-hidden="true"
                    dangerouslySetInnerHTML={{
                      __html: content
                        .replace(/&/g, "&amp;")
                        .replace(/</g, "&lt;")
                        .replace(/>/g, "&gt;")
                        .replace(
                          new RegExp(sourceHighlightText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"),
                          '<mark class="sync-highlight">$&</mark>'
                        ) + "\n",
                    }}
                  />
                )}
                <textarea
                  ref={sourceRef}
                  className="source-textarea"
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  onScroll={handleSourceScroll}
                  onSelect={handleSourceSelect}
                  onMouseUp={handleSourceSelect}
                  onKeyUp={handleSourceSelect}
                  placeholder="Type or open a Markdown file..."
                  spellCheck={false}
                />
              </div>
            </div>
            <div className="divider" onMouseDown={handleMouseDown} />
          </>
        )}
        <div
          ref={previewPaneRef}
          className="preview-pane"
          style={sourceVisible ? { width: `${(1 - splitRatio) * 100}%` } : undefined}
          onScroll={handlePreviewScroll}
          onMouseUp={handlePreviewMouseUp}
        >
          <div
            ref={previewRef}
            className="preview-content markdown-body"
            dangerouslySetInnerHTML={{ __html: renderedHtml }}
          />
        </div>
        {tocItems.length > 0 && (
          <nav className="toc-sidebar">
            <div className="toc-title">目录</div>
            <TocTree items={tocItems} activeId={activeTocId} onItemClick={handleTocClick} />
          </nav>
        )}
      </main>
    </div>
  );
}

export default App;
