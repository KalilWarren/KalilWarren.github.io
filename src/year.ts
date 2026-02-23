const yr = new Date().getFullYear().toString();

const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = yr;

/* toolkit.html also has a citation year span */
const citeYearEl = document.getElementById('cite-year');
if (citeYearEl) citeYearEl.textContent = yr;
