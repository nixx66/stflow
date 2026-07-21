# Tall mint invoice showcase redesign

## Selected visual target

Recreate the approved revised Product Design mock generated at:

`D:/Codex/.codex/generated_images/019f7e0c-8fff-7402-887a-b5c37bdc6ce7/exec-c0f1ca2d-4c91-4847-b9f5-be7afc8c5738.png`

The redesign applies only to the large invoice showcase inside the homepage hero. The headline, navigation, calls to action, following product section, routes, and invoice data remain functionally unchanged.

## Layout

- Align the showcase container to the homepage's broad `max-w-[1760px]` content grid so its left and right edges visually match the green product section below.
- Increase the desktop showcase height from 34rem to approximately 50-56rem, with responsive reductions for tablet and mobile.
- Use a two-column desktop composition: headline in the left/lower third and the glass invoice stack centered in the right half.
- Preserve generous vertical and horizontal negative space. No content may clip at supported widths.
- On smaller screens, stack the copy above a simplified but complete invoice presentation.

## Background and motion

- Replace the dark photographic video with a purpose-built pale mint financial motion asset.
- Palette: a visible fresh green field based on `#dff7cf`, `#c9f3b4`, and restrained `#9cef6e`, supported by ivory and deep ink green.
- Visual language: translucent invoice sheets, ledger columns, settlement nodes, drifting light, and payment rails. Do not introduce flowers, literal nature imagery, office footage, cyberpunk styling, or a dark green slab.
- Motion must be calm and loop seamlessly. Respect reduced-motion preferences by presenting a still frame.

## Floating invoice

- Keep the invoice data as live HTML so typography remains crisp, accessible, and responsive.
- Build the primary invoice as semi-transparent frosted glass with strong backdrop blur, subtle mint refraction, a thin white rim, restrained shadow, and two offset translucent layers behind it.
- Retain the Invoice, Link, Pay, and Receipt state chips with Lucide icons already used by the project. Position them at varied depths without obscuring invoice content.
- Preserve the existing invoice number, amount, unit, network, and status information.

## Typography and color

- Keep the existing homepage font and bold editorial headline style.
- Change the showcase copy from white to deep ink green for contrast on the light mint background.
- Use the existing STFlow lime accent for the eyebrow and small state highlights.
- Maintain the existing large rounded-corner language, using approximately 3.5rem at desktop scale.

## Interaction and accessibility

- Decorative background media is hidden from assistive technology.
- Text and invoice data remain semantic HTML.
- Motion pauses or becomes effectively static under `prefers-reduced-motion: reduce`.
- Keep contrast readable across the brightest areas of the background.

## Verification

- Compare the implemented homepage with the selected mock at the same desktop viewport.
- Confirm the showcase aligns with the section below and has the approved tall proportion.
- Check desktop, tablet, and mobile for clipping, overlap, and readable type.
- Run the project's tests, TypeScript validation, and production build.
- Save a Product Design QA report at `design-qa.md`; implementation is complete only when it reports `final result: passed`.
