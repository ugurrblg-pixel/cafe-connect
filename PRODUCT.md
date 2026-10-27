# Riyo

Mobile-first Turkish web application for meeting people through cafes and shared activities. Existing stack: React, Vite, Supabase and Vercel. Existing production domain: riyosocial.app.

Users discover venues, opt into venue check-ins and use the server-authorized matching/chat flows. Profile photos remain private and scoped to the reviewed cafe projection; image moderation and manual selfie verification remain distinct.

## Confirmed activity feature

The owner approved the three-screen group activity concept on 27 October 2026: map discovery of public meeting points, an activity detail/request screen, and creation with preview. Host approval precedes group chat. Categories are coffee, games and walking. This feature is additional to venue discovery; the venue list remains map-free.

The map represents event meeting points, never live participant locations. New public meeting points are explicitly selected by the creator, independently of Google venue data. A creator confirms public visibility before publication. Do not imply the venue or host has been verified or that representative photography depicts the actual event.

## Existing constraints

Free features first; payments and phone push are deferred. No new photo/selfie access follows from activity membership. Blocked, banned, hidden or departing accounts must not bypass existing account eligibility rules. Activity discovery is authenticated, not publicly indexable. Backend activation and live multi-account checks are prerequisites for launch.

## Release boundaries

The initial activity directory is bounded to 100 active plans within the next 30 days, with local search/category filtering. No push notification delivery, invitation sharing, recurring plans or external booking is claimed. Existing account deletion removes own group messages and hosted activity trees through foreign keys. Expired/cancelled activity conversations close; automatic time-based physical deletion is not claimed.
