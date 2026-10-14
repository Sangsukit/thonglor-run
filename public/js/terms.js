// Shows the organizer contact address when CONTACT_EMAIL is set.
document.addEventListener('DOMContentLoaded', () => {
  fetch('/api/config').then(r => r.json()).then(c => {
    if (!c.contactEmail) return;
    document.querySelectorAll('.contact-email').forEach(a => { a.href = 'mailto:' + c.contactEmail; a.textContent = c.contactEmail; });
    document.querySelectorAll('.terms .contact').forEach(p => { p.hidden = false; });
  }).catch(() => {});
});
