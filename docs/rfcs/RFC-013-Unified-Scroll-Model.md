---
created: 2026-06-13
updated: 2026-09-13
status: rejected
---

# RFC-013: Unified Scroll Model

**Status:** Rejected — superseded by [RFC-014: Scroll Input Model](RFC-014-Scroll-Input-Model.md)  
**Author:** floor  
**Type:** Core Architecture  
**Created:** 2026-06-13  
**Reviewed:** 2026-06-13 — committee ([discussion #117](https://github.com/floor/vlist/discussions/117), as *Spatial Navigation Model*): Claude approve, Codex reject, Grok reject  

This RFC proposed making bounded logical scroll the only scroll model, removing the
native viewport path, and shipping synthetic touch as the v3 default. The committee
rejected it as written: scroll chaining is not a ten-line edge check, the unsigned
render-speed velocity tracker is not reusable for gesture inertia, the synthetic
input surface (cancellation, multitouch, plugins, scrollbar accessibility) was
larger than admitted, and the verification gates were not measurable.

RFC-014 keeps the direction, separates the logical rendering contract from the
input choice, leaves native versus synthetic open until physical-device results are
recorded, and defines the gates.

Preserved for history: [Unified Scroll draft](../refactor/rfc-013-unified-scroll-historical.md),
[integrated Spatial Navigation proposal](../refactor/rfc-013-integrated-proposal-historical.md),
[native-runway plan](../refactor/rfc-013-native-runway-plan-historical.md).
