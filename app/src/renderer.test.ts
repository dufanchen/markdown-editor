import { describe, it, expect } from "vitest";
import { renderMarkdown } from "./renderer";

describe("renderMarkdown", () => {
  describe("Standard Markdown", () => {
    it("renders headings", () => {
      const result = renderMarkdown("# Hello\n## World");
      expect(result).toContain("<h1");
      expect(result).toContain("Hello");
      expect(result).toContain("<h2");
      expect(result).toContain("World");
    });

    it("renders paragraphs", () => {
      const result = renderMarkdown("This is a paragraph.");
      expect(result).toContain("<p>This is a paragraph.</p>");
    });

    it("renders bold and italic", () => {
      const result = renderMarkdown("**bold** and *italic*");
      expect(result).toContain("<strong>bold</strong>");
      expect(result).toContain("<em>italic</em>");
    });

    it("renders links", () => {
      const result = renderMarkdown("[Google](https://google.com)");
      expect(result).toContain('<a href="https://google.com"');
      expect(result).toContain("Google");
    });

    it("renders images", () => {
      const result = renderMarkdown("![alt text](image.png)");
      expect(result).toContain("<img");
      expect(result).toContain('src="image.png"');
      expect(result).toContain('alt="alt text"');
    });

    it("renders unordered lists", () => {
      const result = renderMarkdown("- item 1\n- item 2\n- item 3");
      expect(result).toContain("<ul>");
      expect(result).toContain("<li>item 1</li>");
      expect(result).toContain("<li>item 2</li>");
    });

    it("renders ordered lists", () => {
      const result = renderMarkdown("1. first\n2. second");
      expect(result).toContain("<ol>");
      expect(result).toContain("<li>first</li>");
    });

    it("renders blockquotes", () => {
      const result = renderMarkdown("> This is a quote");
      expect(result).toContain("<blockquote>");
      expect(result).toContain("This is a quote");
    });

    it("renders horizontal rules", () => {
      const result = renderMarkdown("---");
      expect(result).toContain("<hr>");
    });
  });

  describe("GFM Extensions", () => {
    it("renders tables", () => {
      const markdown = "| Name | Age |\n| --- | --- |\n| Alice | 30 |";
      const result = renderMarkdown(markdown);
      expect(result).toContain("<table>");
      expect(result).toContain("<th>Name</th>");
      expect(result).toContain("<td>Alice</td>");
      expect(result).toContain("<td>30</td>");
    });

    it("renders task lists", () => {
      const markdown = "- [x] Done\n- [ ] Not done";
      const result = renderMarkdown(markdown);
      expect(result).toContain('type="checkbox"');
      expect(result).toContain("Done");
      expect(result).toContain("Not done");
    });

    it("renders strikethrough", () => {
      const result = renderMarkdown("~~deleted~~");
      expect(result).toContain("<s>deleted</s>");
    });
  });

  describe("Code Blocks", () => {
    it("renders fenced code blocks with highlighting", () => {
      const markdown = "```js\nconst x = 1;\n```";
      const result = renderMarkdown(markdown);
      expect(result).toContain("<pre>");
      expect(result).toContain("<code");
      expect(result).toContain("hljs");
      expect(result).toContain("language-js");
    });

    it("renders code with syntax highlighting classes", () => {
      const markdown = "```javascript\nfunction hello() {}\n```";
      const result = renderMarkdown(markdown);
      expect(result).toContain("hljs");
    });

    it("renders inline code", () => {
      const result = renderMarkdown("Use `npm install` to install");
      expect(result).toContain("<code>npm install</code>");
    });
  });

  describe("LaTeX Math", () => {
    it("renders inline math", () => {
      const result = renderMarkdown("Inline $E=mc^2$ formula");
      expect(result).toContain("katex");
    });

    it("renders block math", () => {
      const result = renderMarkdown("$$\n\\sum_{i=1}^n i\n$$");
      expect(result).toContain("katex");
    });
  });

  describe("Mermaid Diagrams", () => {
    it("renders mermaid blocks as div containers", () => {
      const markdown = "```mermaid\ngraph TD;\n  A-->B;\n```";
      const result = renderMarkdown(markdown);
      expect(result).toContain('<div class="mermaid">');
      expect(result).toContain("graph TD;");
      expect(result).toContain("A-->B;");
    });
  });

  describe("Footnotes", () => {
    it("renders footnotes with references", () => {
      const markdown =
        "Text with a footnote[^1].\n\n[^1]: This is the footnote content.";
      const result = renderMarkdown(markdown);
      expect(result).toContain("footnote");
    });
  });

  describe("TOC", () => {
    it("generates table of contents from headings", () => {
      const markdown = "${toc}\n\n# First\n## Second\n### Third";
      const result = renderMarkdown(markdown);
      expect(result).toContain("table-of-contents");
    });
  });
});
