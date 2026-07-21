# STFlow Originality Audit

This note records how STFlow can use common fintech and Web3 product patterns without copying another website's visual identity, wording, component composition, or interaction details.

## Core Rule

STFlow may study industry norms, but the shipped product should be defined by its own job:

```text
Create Invoice
  -> Generate Payment Link
  -> Open Pay Page
  -> Mock or real USDC payment
  -> Generate Receipt
  -> Dashboard shows the record
```

Any page block should support this flow. If a section does not explain invoices, payment links, checkout, receipts, Arc proof, or dashboard reconciliation, it should be removed or rewritten.

## What Is Safe To Use

The following are standard product-site patterns and are not unique to any one company:

- a top navigation with grouped sections
- a hero with one primary action
- a workflow diagram
- product module cards
- use-case sections
- developer or integration notes
- dashboard preview
- resource or template library
- FAQ and launch checklist content

These patterns are safe only when STFlow uses its own names, copy, data, visuals, and interaction logic.

## What STFlow Should Avoid

- copying another site's section order exactly
- copying another site's wording, rhythm, slogans, or button labels
- recreating another site's distinctive hero composition
- using the same color palette, gradients, icons, or motion style as a named reference
- writing public docs that say the product "borrows from" another website
- shipping generic SaaS labels everywhere when STFlow can use its own product language

## STFlow-Specific Naming System

Use these labels instead of generic, reference-like labels:

```text
Flow Stack        product modules
Operator Scenes   user and business contexts
Arc Build Path    technical integration ladder
Project Kit       materials for intro, launch, demo, and FAQ
```

These names are closer to STFlow's own identity and reduce the sense that the site is a clone of a common SaaS layout.

## Current Page Architecture

```text
Hero
  STFlow on Arc
  Create Invoice / View Dashboard
  Arc Testnet, USDC, mock-first stats

STFlow Product Map
  Flow Stack
  Operator Scenes
  Arc Build Path
  Project Kit

Workflow
  Create -> Link -> Pay -> Confirm -> Receipt -> Dashboard
  dynamic transaction rail

Flow Stack
  Invoice Builder
  Payment Link
  USDC Checkout
  Receipt Center
  Dashboard
  Proof Layer

Operator Scenes
  Arc builders
  Service studios
  DAO operations
  Treasury teams

Checkout and Dashboard
  KPIs
  invoice table
  status chips

Arc Build Path
  Mock mode
  Wallet mode
  USDC mode
  Memo mode

Receipt and Audit
  visual image block
  timeline

Project Kit
  Project introduction
  Demo script
  Pitch outline
  Launch checklist
  FAQ starter
  Compliance notes
```

## Visual Direction

- large editorial product blocks
- calm green as the primary accent
- white and soft slate backgrounds
- consistent rounded cards
- dynamic motion only for payment state and transaction rail
- no neon crypto styling
- no decorative-only components
- no exact copy of another company's page rhythm

## Copy Direction

STFlow should use language around:

- invoice objects
- payment states
- Arc settlement
- USDC proof
- receipt records
- merchant dashboard review
- mock-first, live-ready progression

Avoid generic slogans such as:

- "financial infrastructure for the internet"
- "move money without borders"
- "accept crypto payments anywhere"
- "all-in-one payment platform"

## Follow-Up Content To Fill Later

- real Arc demo video
- project introduction PDF copy
- Build on Arc pitch deck copy
- detailed FAQ
- security and non-custodial disclaimer
- real screenshots after wallet connection is implemented
