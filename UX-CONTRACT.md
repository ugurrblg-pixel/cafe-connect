# Riyo behavior contract

## Ownership and navigation

`src/components/ui/button.tsx`: shared actions. `src/components/ui/sheet.tsx`: Radix sheet/focus lifecycle. `src/components/ProfileBottomSheet.tsx`: limited cafe profile overlay. `src/hooks/useCafeUsers.ts`: server-projected attendance, 30-second refresh, no broad profile SELECT fallback. `src/hooks/usePrivatePhoto.ts`: private-image adapter. `src/hooks/useCafePhoto.ts`: cafe-photo transport and revocation. `src/lib/visibilityEvents.ts`: local invalidation after a saved block change. Sonner is the shared feedback owner. Existing I18nContext owns application locale; this touched flow uses Turkish.

## Cafe visibility

Joining requires server-validated location and an active check-in. The pre-join notice explains accepted photo/limited-profile visibility to other active attendees. Existing check-ins predating activation do not grant the new photo access. Both participants must be active in the same cafe, visible, unbanned and mutually unblocked. Backend checks apply to every authorization and image request. No public bucket or reusable public/signed image URL is created for this flow.

Client images live only as revocable Blob URLs in memory. Reauthorization runs every 25 seconds without downloading unchanged images again. Authorization failure, hidden tab, logout/account switch, removal or local block invalidation clears rendered bytes. A stalled renewal expires existing bytes after 31 seconds. Remote checkout/block changes are reflected on the next check (at most the current 31-second client window); images already viewed/copied cannot be recalled. The member list refreshes every 30 seconds. Leaving locally removes the list and open profile immediately. Contact fields, birthday and verification selfies never enter the projection.

## State and failure

Loading does not imply an empty cafe. Failed member/photo authorization clears sensitive content and must not fall back to broad tables or public links. Existing profile details must not survive a user/cafe scope change. A failed photo read displays the existing placeholder; it does not retry an external public URL. Existing chat requires mutual matching, and blocking closes the profile and invalidates local visibility. Content acceptance is tied to immutable storage object identity and current profile references.

## Notifications

In-app badges use the existing caller-bound waves, matches and chat inbox RPCs. Opening the inbox does not mark messages read. Seen wave/match identifiers and two badge preferences are stored per account on this browser only. Logout clears displayed counts. No notification permission is requested and no phone-push delivery is claimed.

## Deferred work

The owner selected free features first; payment stays closed until a provider account is supplied. Account deletion requires a separately tested, caller-bound backend flow. The owner selected deletion of the departing user's own sent messages as well as their profile/photos; preserve the peer's messages. Do not claim completion before the backend exists. Browser push additionally requires user permission and a configured delivery service. App-owned destructive dialogs must describe actual deletion/retention behavior.
