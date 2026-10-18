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
