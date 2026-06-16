import { describe, expect, it } from "vitest";
import {
  applyExternalDiskContent,
  applyExternalDiskReadError,
  getNextActiveTabIdAfterClose,
  type TabState,
} from "./useFileManager";

function tab(overrides: Partial<TabState>): TabState {
  return {
    id: "tab-1",
    filePath: "/tmp/a.md",
    content: "saved",
    savedContent: "saved",
    scrollPosition: 0,
    externalChangeState: "none",
    externalContent: null,
    ...overrides,
  };
}

describe("external file refresh state", () => {
  it("updates a clean tab with the new disk content", () => {
    const tabs = [tab({ id: "tab-1" })];

    const result = applyExternalDiskContent(tabs, "tab-1", "changed on disk");

    expect(result).not.toBe(tabs);
    expect(result[0]).toMatchObject({
      content: "changed on disk",
      savedContent: "changed on disk",
      externalChangeState: "none",
      externalContent: null,
    });
  });

  it("preserves dirty content and stores the external version for review", () => {
    const tabs = [
      tab({
        id: "tab-1",
        content: "local draft",
        savedContent: "saved",
      }),
    ];

    const result = applyExternalDiskContent(tabs, "tab-1", "changed on disk");

    expect(result[0]).toMatchObject({
      content: "local draft",
      savedContent: "saved",
      externalChangeState: "changed",
      externalContent: "changed on disk",
    });
  });

  it("marks an unreadable open file as deleted without dropping in-memory content", () => {
    const tabs = [tab({ id: "tab-1", content: "still in memory" })];

    const result = applyExternalDiskReadError(tabs, "tab-1");

    expect(result[0]).toMatchObject({
      content: "still in memory",
      externalChangeState: "deleted",
      externalContent: null,
    });
  });
});

describe("close tab state", () => {
  it("activates the nearest next tab when closing the active tab", () => {
    const tabs = [
      tab({ id: "tab-1" }),
      tab({ id: "tab-2", filePath: "/tmp/b.md" }),
      tab({ id: "tab-3", filePath: "/tmp/c.md" }),
    ];

    expect(getNextActiveTabIdAfterClose(tabs, "tab-2", "tab-2")).toBe("tab-3");
  });

  it("activates the previous tab when closing the last active tab", () => {
    const tabs = [
      tab({ id: "tab-1" }),
      tab({ id: "tab-2", filePath: "/tmp/b.md" }),
    ];

    expect(getNextActiveTabIdAfterClose(tabs, "tab-2", "tab-2")).toBe("tab-1");
  });

  it("returns null when closing the only tab so the caller can close the window", () => {
    const tabs = [tab({ id: "tab-1" })];

    expect(getNextActiveTabIdAfterClose(tabs, "tab-1", "tab-1")).toBeNull();
  });
});
