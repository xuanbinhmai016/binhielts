export const $ = id => document.getElementById(id);
export function message(text) { $('status').textContent = text; }
export function button(text, action) {
  const b = document.createElement('button');
  b.type = 'button'; b.textContent = text; b.onclick = action; return b;
}
export function paragraph(text, cls) {
  const p = document.createElement('p');
  p.textContent = text; if (cls) p.className = cls; return p;
}
