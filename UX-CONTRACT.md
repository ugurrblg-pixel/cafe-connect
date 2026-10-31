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

## Free-feature navigation and availability

Profile links to notification preferences and Safety & Privacy. `useProfileVisibility` owns the authenticated user's own profile visibility: unresolved/error state disables toggling, saves are pessimistic and require a returned row, failures retain the previous switch state, and account changes ignore old requests. Successful changes invalidate visible profiles/photos. The hidden state closes messaging and suppresses venue-profile discovery under existing server rules; it does not end the active check-in.

Search reuses the real Discover page and its nearby cache instead of demo venues. Typing filters the loaded venue list without a new Places lookup. Random matching stays gated off until a reviewed caller-bound server flow exists; the legacy direct-table/opposite-gender client path must not be enabled by merely changing a flag. Venue waves and mutual chat remain available. The temporary conversation-list action is named hide, never delete: no messages are removed, the peer is unaffected and reloading restores the row.

## Message removal

Message actions have a keyboard-accessible options button in addition to long press/context menu. The actual caller-bound `remove_own_chat_message` RPC removes the sender's content for both participants; the UI only offers “Herkes için sil” with explicit confirmation. There is no local-only removal implementation, so do not wire that label to the everyone RPC. Existing server ownership/chat-availability checks remain authoritative; no premium/time rule is invented solely in the client. The confirmation stays open with an inline failure and suppresses duplicate submission/dismissal while waiting. Account/conversation changes ignore old mutation responses.

## Deferred work

The owner selected free features first; payment stays closed until a provider account is supplied. Browser push additionally requires user permission and a configured delivery service.

## Account deletion

`AccountDeletionSection` owns initiation, inline failure/pending/reauth state and success-only local logout. `DeleteAccountDialog` reuses shared AlertDialog, Button and Input owners. The least destructive action initially receives focus. Exact `SİL` confirmation is required for this rare permanent action. Busy state prevents duplicate submission and dismissal. Opening or reauthenticating never starts deletion automatically. Recent sign-in and caller identity are checked by the server, not only UI.

Profile, photos, verification selfies, own-sent messages and social activity are removed. Peer messages remain stored in inactive, restricted conversations; no new history view is opened. Restricted reports, bans/warnings and admin audit history are retained. Do not promise all records/backups are erased or a 30-day recovery window. Partial failures keep the profile closed and explain manual retry; no background completion is claimed. See `supabase/ACCOUNT_DELETION.md` for the staged storage/Auth boundary. Feature flags remain off until activation checks pass.

## Venue directory sources

`VenueSources` owns provider/license disclosure in Discover and CafeRoom. Discovery sorting keeps its existing native select: operating-system popup geometry is accepted for this compact ordering control. Approved independent records retain their own source credits across memory cache, quota fallback and venue details. Google identities are not replaced during the initial additive pilot. Unknown opening status is not displayed as open.

## Discovery list ownership

VenueListCard owns the keyboard-accessible venue navigation row. Search filters loaded results and its clear action restores input focus. Select/Listbox: native ownership is retained for discovery sorting, with its existing accessible label and real sort behavior. No map or additional location request is introduced by this layout.

## Venue participant presentation

Attendance mutations remain owned by useCheckIn. CafeRoom disables duplicate join/leave actions while resolving attendance or waiting for its existing mutation. CheckInButton labels the leave action explicitly. Before joining, participant counts are unavailable rather than reported as zero; loading and failed reads remain distinct. UserCard uses native profile/wave/chat buttons, wraps long names and does not infer presence from missing timestamps. ProfileBottomSheet restores focus to its opener and uses the current cafe when resolving a match/conversation. New profile fields and broader photo access are not introduced.

New verification instructions ask for the right hand raised with face and hand visible. The existing consent/upload/manual admin review flow remains; there is no automated pose check. Previously verified accounts are not invalidated by this presentation update.

## Navigation and recovery polish

BottomNav stays within the shared content width and marks nested profile routes as the current destination. Discover filters wrap on narrow screens, preserve loaded-data-only search, and provide one reset action for empty filtered results. The location summary states the existing 2 km scope. Failed profile loading keeps navigation available and ignores responses after account/screen changes. Missing venue details provide retry and a return to discovery. No access rules change.


## Group activities

The server availability RPC gates navigation and every new operation. See supabase/ACTIVITIES_SETUP.md for explicit activation, live verification and rollback. Activity creation is details → preview/public-location consent → idempotent publish. Native date/time (Türkiye) and number inputs are the intentional canonical owners. The existing Button/Input/Textarea/AlertDialog own controls and destructive confirmations. Membership is request → pending → accepted/declined; accepted users can leave and hosts can remove/cancel. Capacity includes the host and is checked under a server row lock. No location or check-in implies admission. Expiry/cancellation closes group chat. Only accepted participants and the host may read/write group text; membership never grants photo access. Messages are not rendered from cache before renewed authorization. Lists, requests and chats use bounded refresh; exact windows and account-deletion behavior are recorded in ACTIVITIES_SETUP.md. Reports reference the activity in the existing admin inbox and do not automatically penalize an organizer.


## Warm interface discovery controls
Discovery starts at 2 km. Radius (500/1000/2000 m), category, Turkish name search and sorting filter already loaded results without additional Places requests. Unknown distances appear only at the default radius. Native labeled selects live in the shared focus-managed Sheet. Reset restores defaults; loading, location denied, provider error and empty results remain distinct. Cards open venue details; only the existing consent/location-gated action can create a check-in. The active-check-in shortcut requires an actual unexpired own check-in. No decorative attendee portraits, inferred venue attributes or fake detected-location claims are permitted.
