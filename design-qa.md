# Design QA — Tall Mint Invoice Showcase

## Evidence

- Approved source: tall mint invoice showcase reference
- Desktop implementation: production desktop capture
- Responsive implementation: production mobile capture
- Combined comparison: reference and implementation comparison
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

# Regression QA — Presentation Refactor

## Evidence

- Baselines: `tmp/refactor-baseline/{home-desktop,home-mobile,dashboard-desktop,invoice-new-desktop,pay-desktop,receipt-desktop}.png`
- Post-refactor captures: `tmp/refactor-post/{home-desktop,home-mobile,dashboard-desktop,invoice-new-desktop,pay-desktop,receipt-desktop}.png`
- Capture environment: fresh Edge headless profiles against the rebuilt production server, 5-second virtual-time budget; 1600 × 1200 for all desktop routes and 500 × 1200 for the mobile homepage. The mobile baseline was recaptured from the clean main checkout at `a04ab54` on port 3100 and the post-refactor image from clean `19dcc49` on port 3101 using the identical Edge version and flags: `--headless=new`, `--disable-gpu`, `--hide-scrollbars`, `--force-device-scale-factor=1`, `--window-size=500,1200`, `--virtual-time-budget=5000`, fresh profiles, and top-of-page capture.
- Routes: `/`, `/dashboard`, `/invoice/new`, `/pay/af-1029`, and `/receipt/af-1001`.

### Final-review desktop recapture (supersedes earlier desktop evidence)

- Clean baseline: main checkout `a04ab54` on port 3100. Clean post-refactor: `71e2c2c` on port 3101.
- Both rebuilt production bundles used hash-matched ignored local environment configuration, the same explicit empty invoice-store path, fresh elevated Edge profiles, top-of-page capture, and a 10-second virtual-time budget.
- Shared desktop conditions: 1600 x 1200, device scale 1, `--headless=new`, `--disable-gpu`, `--hide-scrollbars`, `--force-device-scale-factor=1`, `--force-color-profile=srgb`, `--window-size=1600,1200`, `--virtual-time-budget=10000`, and `--run-all-compositor-stages-before-draw`.
- Accepted files replaced only after validation: `tmp/refactor-baseline/{home-desktop,dashboard-desktop,invoice-new-desktop}.png` and `tmp/refactor-post/{home-desktop,dashboard-desktop,invoice-new-desktop}.png`. All six are nonblank 1600 x 1200 PNGs.

## Findings

- P0: none.
- P1: none.
- P2: none.
- Final-review verdict (supersedes all preceding desktop P3 characterization): P3 none. The dashboard pair is pixel-identical. The homepage and invoice-new pairs have identical layout, copy, and class treatments; their only measured variance is in existing animated scene backgrounds (home: 20,530 of 1,920,000 changed pixels, 1.069271%, mean absolute RGBA delta 0.012616; invoice new: 283,372, 14.758958%, mean absolute RGBA delta 0.555464). Pay and receipt remain byte-identical; the matched mobile homepage retains its no-scrollbar two-line headline wrap.
- Historical pre-recapture note (superseded by the final-review verdict above): dashboard card order was observed before the hydration-stable desktop recapture. The pay and receipt captures are byte-identical to the baseline; the recaptured mobile homepage pair has identical no-scrollbar viewport conditions and the same two-line `without chaos.` headline wrap.

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
