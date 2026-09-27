# RFCs

Design proposals and architecture decisions for vlist. Each RFC documents the motivation, design options, tradeoffs, and implementation plan for a significant change.

RFCs are discussed in [GitHub Discussions](https://github.com/floor/vlist/discussions).

| RFC | Status | Topic |
|-----|--------|-------|
| [RFC-015: Overflow Handoff](/docs/rfcs/RFC-015-Overflow-Handoff) | Implemented (3.1) | `scroll.mode` on the one `vlist` entry: `"auto"` scrolls natively and hands input to the lazily loaded synthetic driver in place past the browser size limit |
| [RFC-014: Scroll Input Model](/docs/rfcs/RFC-014-Scroll-Input-Model) | Shipped (opt-in) | Who owns scroll input: native by default, synthetic input as the opt-in `vlist/synthetic` entry |
| [RFC-013: Unified Scroll Model](/docs/rfcs/RFC-013-Unified-Scroll-Model) | Rejected | Bounded-only model with native path removed; superseded by RFC-014 |
| [RFC-012: Logical Scroll Model](/docs/rfcs/RFC-012-Logical-Scroll-Model) | Implemented, narrowed in 3.0 | Viewport-sized content with logical scroll; since 3.0 only the carousel's wrap uses it — huge lists moved to RFC-014. Scrollbar, RTL, adapter adoption and page mode carried by RFC-014 as 3.0 gates |
| [RFC-011: Carousel Plugin](/docs/rfcs/RFC-011-Carousel-Plugin) | Implemented | Paged carousel with infinite loop, snap, and focal scaling |
| [RFC-010: Externalized UI Text](/docs/rfcs/RFC-010-Externalized-UI-Text) | Implemented | No inline human-language strings; consumer-supplied text with one overridable default per plugin |
| [RFC-009: Configuration Immutability](/docs/rfcs/RFC-009-Configuration-Immutability) | Partially implemented | Immutable config architecture, runtime escape hatches, rebuild continuity |
| [RFC-008: Search Plugin](/docs/rfcs/RFC-008-Search-Plugin) | Phase 1 implemented | Built-in search bar with filter/navigate modes |
| [RFC-007: Tree Plugin](/docs/rfcs/RFC-007-Tree-Plugin) | Implemented | Hierarchical tree view with keyboard and ARIA |
| [RFC-006: Hot-Path Optimization](/docs/rfcs/RFC-006-Core-Hot-Path-Optimization) | Implemented | Scroll handler zero-allocation pass |
| [RFC-005: Axis Config](/docs/rfcs/RFC-005-Axis-Config) | Implemented | Axis-based internal model for orientation |
| [RFC-004: Core Optimization](/docs/rfcs/RFC-004-Core-Optimization) | Implemented | v2 core performance optimization |
| [RFC-003: Implementation Stabilization](/docs/rfcs/RFC-003-Implementation-Stabilization) | Implemented | v2 stabilization and test coverage |
| [RFC-002: Core Architecture](/docs/rfcs/RFC-002-Core-Architecture) | Implemented | v2 core architecture plan |
