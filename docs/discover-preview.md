# Submitted discovery design preview — light revision

The owner requested the pasted discovery HTML on a separate trial page, then supplied a light revision on 28 October 2026. `/deneme/kesfet` is authenticated and has no main-navigation entry. Existing Discover, its data, check-in rules, radius and global brand tokens are unchanged.

The uploaded markup is rendered in a sandboxed iframe. Its original scripts are removed, including the CDN Tailwind compiler and fake successful-check-in interaction. Tailwind is compiled locally into an inline-only stylesheet with the submitted theme; styles do not enter the parent document. The owned preview script only filters/sorts the three explicit example cards and displays demo notices. CSP denies API connections, forms and all scripts except the owned nonce-bearing script. The iframe does not get same-origin, popup or parent-navigation permissions.

This is an intentionally separate visual world: the current submitted warm #F8F7F4 background, white cards, Syne/Plus Jakarta Sans, #E07A5F actions, navy selected filters and green accents are preserved. Both the header filter and “Değiştir” button open the same demo controls. This does not approve a global Riyo rebrand. The demo toolbar is always outside the iframe and names the example-data/no-write boundary. Browser zoom and reduced motion remain supported. Google font and supplied public concept-image URLs may load; image failure falls back to existing local representative assets.

Native select/dialog own the isolated demo filters. Every sample check-in/navigation action explains it does not change the real account. No real participant photos, live counts, session tokens, GPS, Supabase clients or credentials enter the frame.
