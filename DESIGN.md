# Riyo interface context

Riyo is a Turkish cafe-based social application. This document records the owner-approved warm light interface. Product screens prioritize safe venue attendance, clear visibility, consent and honest status. Payment and push permissions must never be implied by decorative controls.

## Token ownership

Model B: `src/index.css` owns runtime semantic HSL tokens. `tailwind.config.ts` maps those tokens to shared primitives. This document mirrors source roles; it does not generate or override CSS.

- Background: #F8F7F4; foreground: #1E293B.
- Primary: #BF5237 with white labels (4.69:1); decorative brand: #E07A5F, soft brand: #FDF4F0. The supplied light terracotta is darkened for readable small button labels.
- Accent: #26784F; online: #52B788; secondary: #F1EFEA.
- Muted foreground: #5D6B80; border: #E2E8F0.
- Font: Plus Jakarta Sans body, Syne headings, system fallbacks.
- Existing rounded controls/cards and neutral shadows come from shared CSS/primitive classes. Do not introduce screen-local colors or a second token adapter.

## Canonical owners

`Button` owns actions. Radix-backed `Sheet`/`Dialog` own focus containment and overlays. `ProfileBottomSheet` owns the venue-scoped profile preview. `PrivateProfileImage`/`usePrivatePhoto` own private image resolution; `useCafePhoto` adds caller-bound venue checks and temporary in-memory image bytes. Sonner owns toast feedback. `CheckInButton` explains visibility before joining. No separate user-profile page should bypass this projection.

## Content and accessibility

Use Turkish labels and explicit operation names. Loading, unavailable/denied, empty and success states must remain distinct. Icon controls need accessible names; keyboard access must not depend on clicking a card. Respect inherited reduced motion. Existing unrelated English admin labels and generic click-target drift are pre-existing issues, not accepted new design rules.

## Scope boundaries

A cafe profile includes display name, age, bio, purpose, interests, verification badge and accepted photos only. Never infer public access to email, phone, birthday, selfie or exact coordinates. Content screening and manual account verification remain separate. Follow `UX-CONTRACT.md` for visibility lifetime and recovery.

## Venue source disclosure

`VenueSources` owns source/license disclosure across discovery and venue details. Card captions name the actual provider; expanded credits preserve the source attribution text and link only to maintained provider/license URLs. Use inherited muted typography and native keyboard-accessible disclosure. Unknown opening status stays unknown; a source match is not an account or business verification badge.

## Discovery list

Discovery uses full-width vertical photo cards, strong venue names, distance and real attendance counts. Warm terracotta actions and restrained green attendance indicators follow the supplied light concept. The chosen layout has no map. Representative image labels and provider credits remain visible; decorative attendee portraits must not imply access to private photos.


## Group activities

The owner-approved three-screen activity concept inherits Riyo's warm neutral, terracotta and Plus Jakarta Sans/Syne design. ActivityMap owns Leaflet and its visible OSM credit, compact count pins and keyboard-accessible location selection. Activities owns the public plan list, detail, preview/consent and private group conversation. This adds an activity map without changing the map-free venue list. See docs/activities-design.md.


## Discovery refinement
Keep the approved warm palette. Discovery opens with a restrained editorial heading, followed by compact location and search controls. Category chips scroll horizontally on narrow screens; venue cards form one column on phones and two columns from 640px. Visible sorting shares state with the filter sheet. Card actions say Mekanı keşfet and open existing venue detail gates. Inbox and notifications use short introductory headings with no invented activity statistics.


Owner revision: venue listing returns to the preceding single-column full-width photo cards at every viewport, with the original card proportions and check-in detail action. The refined heading, filters and conversation screens remain. This supersedes the two-column discovery refinement above.


## Detail polish
Preserve the single-column venue list. Shared navigation uses wider selected icon surfaces, subtle top shadow and stronger labels. Header controls and profile edit affordances have 44px targets and visible focus. The own-profile cover uses stationary concentric rings as decoration, without any verification or attendance meaning. Profile counters group in a neutral inset surface. Existing typography, runtime palette and privacy owners remain canonical.


## Owner supplied navigation dock
The base64 SVG reference defines a floating graphite pill with a lime selected capsule. BottomNav implements it as real keyboard-operable route buttons; original app route names, unread counters and activity availability rules remain. Dock colors are locally scoped semantic variables in index.css and do not recolor the application. The container reserves safe-area space; the active-check-in shortcut stays above it. Source example labels (games/wheel/team) do not create unsupported routes.


Owner adjustment: retain the floating capsule silhouette but use canonical card, primary terracotta, muted and border tokens throughout. The dock is capped at 448px, with 56px button targets and 22px icons. This supersedes the graphite/lime color specification; route behavior is unchanged.


## Selected concept 2: compact radar
Owner chose the compact-list mockup. VenueListCard is a single full-width route button with a left thumbnail, right name, actual distance/count, factual category/provider and trailing chevron. One column at every viewport, subtle row separators, no large card CTA. Source and representative-image captions remain. The oversized discovery intro and repeated social explanation are removed to prioritize nearby results. No unsupported amenity claims or mock attendance numbers are carried into production.


Compact concept header alignment: in-flow large terracotta Riyo wordmark and Sosyal Radar subtitle; notification/filter actions; unified search/radius field and pill categories. The real location action remains visible when needed. No prototype labels or invented metadata enter production.


Radar typography polish: Syne is reserved for the Riyo wordmark, with tight optical spacing. Compact list titles and venue names explicitly use Plus Jakarta Sans for Turkish readability. Supporting distance/count text uses medium weight and tabular numerals; provider captions have an 11px floor. No data or route behavior changes.


Owner correction to screenshot typography: the compact mockup uses a plain geometric sans wordmark, not Syne. Radar Riyo is explicitly Plus Jakarta Sans extra-bold at 56px (64px wide), with normal-spaced 19px gray Sosyal Radar beneath. The compact section headline uses the same sans family extra-bold. This supersedes the preceding wordmark typography choice.


## Latest supplied Radar HTML
Owner replaced the compact concept with the supplied social showcase HTML. Radar now has a 440px warm canvas, coffee ring decoration, 36px Riyo header, short subtitle, exact hero copy, separate search/radius controls, featured venue and white nearby cards. Featured venue is selected from filtered real results by active attendance; when nobody is present the badge says Yakınında keşfet. No fabricated ratings, amenities, availability, live waves or attendee portraits. Existing route and consent gates stay unchanged; source credits remain.


## Supplied activity showcase
Activity directory follows the supplied mint concept, Bricolage Grotesque headings and Karla body, Plus Jakarta wordmark, featured real plan and compact white cards. Date select filters all/today/tomorrow locally; all is default to avoid hiding future plans. Map remains available via explicit toggle, creation and detail/approval flows are preserved. Only backend-supported coffee/games/walk categories are offered. No static portraits, invented table amenities, fake live counts or direct wave-to-join action. Featured action opens detail before participation.
