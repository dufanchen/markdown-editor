import MarkdownIt from "markdown-it";
import highlightjs from "markdown-it-highlightjs";
import katex from "@traptitech/markdown-it-katex";
import footnote from "markdown-it-footnote";
import { tasklist } from "@mdit/plugin-tasklist";
import anchor from "markdown-it-anchor";
import tocDoneRight from "markdown-it-toc-done-right";

import "katex/dist/katex.min.css";
import "highlight.js/styles/github.css";

const markdownRenderer = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
});

markdownRenderer.use(highlightjs);
markdownRenderer.use(katex, { throwOnError: false });
markdownRenderer.use(footnote);
markdownRenderer.use(tasklist, { disabled: false });
markdownRenderer.use(anchor, { permalink: false });
markdownRenderer.use(tocDoneRight);

// Custom fence renderer for Mermaid diagrams
const defaultFence =
  markdownRenderer.renderer.rules.fence ||
  function (tokens, idx, options, _env, self) {
    return self.renderToken(tokens, idx, options);
  };

markdownRenderer.renderer.rules.fence = (tokens, idx, options, env, self) => {
  const token = tokens[idx];
  if (token.info.trim() === "mermaid") {
    return `<div class="mermaid">${token.content}</div>`;
  }
  return defaultFence(tokens, idx, options, env, self);
};

function wrapSections(html: string): string {
  if (typeof DOMParser === "undefined") return html;

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${html}</div>`, "text/html");
  const root = doc.body.firstElementChild as HTMLElement;
  if (!root) return html;

  const wrapLevel = (container: HTMLElement, maxLevel: number) => {
    if (maxLevel > 3) return; // Only indent h1, h2, h3
    const children = Array.from(container.childNodes);
    const fragment = doc.createDocumentFragment();
    let currentSection: HTMLElement | null = null;

    for (const child of children) {
      const isHeading =
        child instanceof HTMLElement &&
        /^H[1-6]$/.test(child.tagName);
      const headingLevel = isHeading
        ? parseInt((child as HTMLElement).tagName[1], 10)
        : 0;

      if (isHeading && headingLevel === maxLevel) {
        // Close previous section
        if (currentSection) {
          wrapLevel(currentSection, maxLevel + 1);
          fragment.appendChild(currentSection);
        }
        // Start new section
        currentSection = doc.createElement("section");
        currentSection.className = `section-level-${maxLevel}`;
        currentSection.appendChild(child);
      } else if (currentSection) {
        currentSection.appendChild(child);
      } else {
        fragment.appendChild(child);
      }
    }
    if (currentSection) {
      wrapLevel(currentSection, maxLevel + 1);
      fragment.appendChild(currentSection);
    }
    container.innerHTML = "";
    container.appendChild(fragment);
  };

  // Find the minimum heading level present
  const headingMatch = html.match(/<h([1-6])/);
  const startLevel = headingMatch ? parseInt(headingMatch[1], 10) : 1;
  wrapLevel(root, startLevel);
  return root.innerHTML;
}

export function renderMarkdown(source: string): string {
  const raw = markdownRenderer.render(source);
  return wrapSections(raw);
}
