// Preview-only behavior. No authentication, storage, API or real check-in calls.
(() => {
  const cards = Array.from(document.querySelectorAll('[data-preview-venue]'));
  const filters = Array.from(document.querySelectorAll('[data-preview-category]'));
  const dialog = document.getElementById('preview-filters');
  const notice = document.getElementById('preview-notice');
  let category = 'all';
  let noticeTimer;
  function notify(text) {
    clearTimeout(noticeTimer);
    notice.textContent = text;
    notice.hidden = false;
    noticeTimer = setTimeout(() => { notice.hidden = true; }, 5000);
  }
  function update() {
    const radius = Number(document.getElementById('preview-radius').value);
    const sort = document.getElementById('preview-sort').value;
    const sorted = [...cards].sort((a, b) => sort === 'active'
      ? Number(b.dataset.people) - Number(a.dataset.people)
      : Number(a.dataset.distance) - Number(b.dataset.distance));
    for (const card of sorted) {
      card.hidden = Number(card.dataset.distance) > radius || (category !== 'all' && !card.dataset.previewTags.split(' ').includes(category));
      card.parentElement.appendChild(card);
    }
    for (const filter of filters) filter.setAttribute('aria-pressed', String(filter.dataset.previewCategory === category));
    document.querySelector('[data-preview-radius-label]').textContent = `Moda, Kadıköy • ${radius >= 1000 ? radius / 1000 + ' km' : radius + ' m'} çevresinde`;
    document.getElementById('preview-empty').hidden = cards.some(card => !card.hidden);
  }
  for (const filter of filters) filter.addEventListener('click', () => { category = filter.dataset.previewCategory; update(); });
  for (const button of document.querySelectorAll('[data-preview-filters]')) button.addEventListener('click', () => dialog.showModal());
  for (const button of dialog.querySelectorAll('button')) button.addEventListener('click', event => { event.preventDefault(); dialog.close(); });
  document.getElementById('preview-radius').addEventListener('change', update);
  document.getElementById('preview-sort').addEventListener('change', update);
  for (const button of document.querySelectorAll('[data-preview-checkin]')) button.addEventListener('click', () => notify('Tasarım denemesi: check-in kaydı oluşturulmadı.'));
  for (const link of document.querySelectorAll('nav a')) link.addEventListener('click', event => {
    event.preventDefault();
    notify(`${link.textContent.trim()}: bu taslakta yalnız görünüm deneniyor. Ana uygulamadaki hesabın değişmez.`);
  });
  for (const target of document.querySelectorAll('[data-preview-notice]')) {
    target.addEventListener('click', () => notify(target.dataset.previewNotice));
    target.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); notify(target.dataset.previewNotice); } });
  }
  for (const image of document.querySelectorAll('img')) image.addEventListener('error', () => {
    if (image.dataset.fallback) return;
    image.dataset.fallback = 'true';
    image.src = `${document.documentElement.dataset.assetOrigin}/placeholders/cafes/${image.closest('[data-preview-venue]').dataset.previewVenue === 'gym' ? 'riyo-gym.webp' : image.closest('[data-preview-venue]').dataset.previewVenue === 'bar' ? 'riyo-bar.webp' : 'riyo-cafe-cozy.webp'}`;
  });
})();
