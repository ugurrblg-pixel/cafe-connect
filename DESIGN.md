# Riyo interface context

Riyo is a Turkish cafe-based social application. This document records the incumbent product UI, not a rebrand. Product screens prioritize safe venue attendance, clear visibility, consent and honest status. Payment and push permissions must never be implied by decorative controls.

## Token ownership

Model B: `src/index.css` owns runtime semantic HSL tokens. `tailwind.config.ts` maps those tokens to shared primitives. This document mirrors source roles; it does not generate or override CSS.

- Background: `214 15% 97%`; foreground: `221 39% 11%`.
- Primary/coral: `359 100% 63%`; primary foreground: white.
- Accent/teal: `191 91% 53%`; secondary: `214 15% 94%`.
- Muted foreground: `218 11% 45%`; border: `214 15% 91%`.
- Font: Inter with system fallbacks; normal product body text, strong headings and restrained captions.
- Existing rounded controls/cards and neutral shadows come from shared CSS/primitive classes. Do not introduce screen-local colors or a second token adapter.

## Canonical owners

`Button` owns actions. Radix-backed `Sheet`/`Dialog` own focus containment and overlays. `ProfileBottomSheet` owns the venue-scoped profile preview. `PrivateProfileImage`/`usePrivatePhoto` own private image resolution; `useCafePhoto` adds caller-bound venue checks and temporary in-memory image bytes. Sonner owns toast feedback. `CheckInButton` explains visibility before joining. No separate user-profile page should bypass this projection.

## Content and accessibility

Use Turkish labels and explicit operation names. Loading, unavailable/denied, empty and success states must remain distinct. Icon controls need accessible names; keyboard access must not depend on clicking a card. Respect inherited reduced motion. Existing unrelated English admin labels and generic click-target drift are pre-existing issues, not accepted new design rules.

## Scope boundaries

A cafe profile includes display name, age, bio, purpose, interests, verification badge and accepted photos only. Never infer public access to email, phone, birthday, selfie or exact coordinates. Content screening and manual account verification remain separate. Follow `UX-CONTRACT.md` for visibility lifetime and recovery.

## Venue source disclosure

`VenueSources` owns source/license disclosure across discovery and venue details. Card captions name the actual provider; expanded credits preserve the source attribution text and link only to maintained provider/license URLs. Use inherited muted typography and native keyboard-accessible disclosure. Unknown opening status stays unknown; a source match is not an account or business verification badge.
