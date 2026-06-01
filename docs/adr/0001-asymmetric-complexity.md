# Asymmetric Complexity: Rich Preview, Minimal Editor

The app deliberately concentrates complexity in the Preview Pane (full Markdown feature support, Typora-level styling, dark/light themes) while keeping the Source Pane as a plain textarea with no syntax highlighting or autocompletion. This reflects the primary use case — users mostly read/preview Markdown files and only occasionally edit them — so investment goes where attention goes. A rich editor (e.g. CodeMirror) can be added later without architectural changes since the two panes are decoupled.

## Considered Options

- **Rich editor + rich preview**: Higher implementation cost, most of the editor features would be underused given the "viewer-first" positioning.
- **Rich editor + no live preview**: Misaligns with the core use case of *viewing* rendered Markdown.
- **Plain editor + rich preview (chosen)**: Matches the "view first, edit sometimes" workflow. Lowest cost path to the experience users care about most.
