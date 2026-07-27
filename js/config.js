(() => {
const DEBOUNCE_MS = 650;

const CROSSREF_FIELDS =
  "DOI,title,author,published,container-title,score,type,publisher,ISBN";

const BOOK_TYPES = new Set([
  "book",
  "monograph",
  "edited-book",
  "reference-book",
  "book-set",
]);

const STYLE_LABELS = [
  "APA 7th",
  "MLA 9th",
  "Chicago",
  "Harvard",
  "Vancouver",
  "ACS",
];

window.CiteApp = window.CiteApp || {};
window.CiteApp.config = {
  DEBOUNCE_MS,
  CROSSREF_FIELDS,
  BOOK_TYPES,
  STYLE_LABELS,
};
})();
