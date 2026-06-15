# Documentation Index

这个目录保存产品定义、功能 spec、架构决策和素材。后续新增功能先在 `specs/` 写清楚目标、方案和验收标准，再进入 `app/` 开发。

## Structure

```text
docs/
├── product/              # 产品背景、PRD、术语
├── specs/                # 功能开发前的规格说明
├── adr/                  # 架构决策记录
└── assets/               # 文档配图等非工程素材
```

## Current Documents

- [Product PRD](product/PRD.md)
- [Glossary](product/GLOSSARY.md)
- [Origin Story](product/origin-story.md)
- [ADR-0001: Asymmetric Complexity](adr/0001-asymmetric-complexity.md)
- [Spec: Live File Refresh](specs/0001-live-file-refresh.md)
- [Spec: In-document Search](specs/0002-in-document-search.md)
- [Spec: Close App on Last Tab Close](specs/0003-close-app-on-last-tab.md)

## Workflow

1. 新功能先新增或更新 `docs/specs/` 下的 spec。
2. spec 通过后，在 `app/` 内做工程实现。
3. 涉及长期架构取舍时，在 `docs/adr/` 记录 ADR。
4. 用户可见能力变化写入根目录 `CHANGELOG.md`。
