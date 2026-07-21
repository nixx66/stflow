# Design QA — Tall Mint Invoice Showcase

## Evidence

- Approved source: `D:\Codex\.codex\generated_images\019f7e0c-8fff-7402-887a-b5c37bdc6ce7\exec-c0f1ca2d-4c91-4847-b9f5-be7afc8c5738.png`
- Desktop implementation: `D:\360MoveData\Users\yaoxt\Documents\ArcFlow\tmp\design-qa\homepage-desktop-production.png`
- Responsive implementation: `D:\360MoveData\Users\yaoxt\Documents\ArcFlow\tmp\design-qa\homepage-mobile-production-final.png`
- Combined comparison: `D:\360MoveData\Users\yaoxt\Documents\ArcFlow\tmp\design-qa\reference-vs-implementation.png`
- Desktop viewport: 2048 × 2800
- Responsive viewport: 500 × 3000
- State: homepage, default logged-out presentation

## Comparison history

1. First implementation matched the approved mint financial direction, but the desktop poster was too short and the headline wrapped differently from the source. The poster height was increased to a 54–64rem responsive range and the headline scale was adjusted to restore the intended three-line lockup.
2. The first responsive capture exposed a P2 overflow: the four floating lifecycle modules remained beside the invoice and were clipped. The responsive layout now stacks them vertically below the invoice and uses a smaller narrow-screen headline scale.
3. Final desktop and responsive captures show aligned outer gutters, a taller editorial composition, readable invoice data, visible frosted layers, and no clipped poster content.

## Final findings

- P0: none
- P1: none
- P2: none
- P3: the live composition uses a straight invoice card instead of the slight perspective angle in the generated concept; this preserves text clarity and does not reduce the requested visual hierarchy.

final result: passed

---

# Design QA — Homepage Mint Color System

## Evidence

- Before capture: `D:\360MoveData\Users\yaoxt\Documents\ArcFlow\tmp\homepage-color-audit.png`
- Product section: `D:\360MoveData\Users\yaoxt\Documents\ArcFlow\tmp\design-qa\homepage-color-unified-product.png`
- Dashboard section: `D:\360MoveData\Users\yaoxt\Documents\ArcFlow\tmp\design-qa\homepage-color-unified-dashboard.png`
- Workflow section: `D:\360MoveData\Users\yaoxt\Documents\ArcFlow\tmp\design-qa\homepage-color-unified-workflow.png`
- Receipt, CTA, and footer: `D:\360MoveData\Users\yaoxt\Documents\ArcFlow\tmp\design-qa\homepage-color-unified-footer.png`
- Narrow Product section: `D:\360MoveData\Users\yaoxt\Documents\ArcFlow\tmp\design-qa\homepage-color-unified-mobile.png`
- Desktop viewport: 1600 × 1400 or 1600 × 1500 per section
- Narrow viewport: 500 × 1800
- State: homepage default presentation, scrolled to each named section

## Comparison history

1. The source audit and code inspection showed three competing treatments: pale gray-green sections, a neon Product block, and a yellow calculator amount surface.
2. The implementation replaced those outliers with one mint scale: `#F7FBF4` canvas, `#F1F8EC` and `#EAF6E3` section surfaces, `#8FDE68` Product emphasis, `#FBFFF8` cards, and `#063F2C` CTA emphasis.
3. Final captures confirm continuous outer gutters, consistent green-gray borders, readable dark text, no yellow surface, no clipped narrow-screen Product content, and a clear dark-green closing CTA.

## Final findings

- P0: none
- P1: none
- P2: none
- P3: the Product block intentionally remains the most saturated section; its hue now matches the rest of the page and functions as the primary mid-page emphasis.

final result: passed
