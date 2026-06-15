# Markdown Editor App

这里是桌面应用的工程实现目录。产品文档和功能 spec 放在根目录的 `docs/`，这里保持为 Tauri + React + TypeScript 工程。

## Stack

- Tauri v2
- React 19
- TypeScript
- Vite
- Vitest

## Development

```bash
npm install
npm run tauri dev
```

## Scripts

```bash
npm run test
npm run lint
npm run tauri build
```

## Source Layout

```text
src/
├── App.tsx             # Main UI, layout, tabs, preview interactions
├── renderer.ts         # Markdown rendering pipeline
├── renderer.test.ts    # Renderer tests
├── useFileManager.ts   # File open/save and tab state
└── useTheme.ts         # Theme and font scale state

src-tauri/
├── src/lib.rs          # Tauri commands and native event handling
├── src/main.rs         # App entrypoint
├── capabilities/       # Tauri permission config
└── resources/          # Bundled app resources
```
