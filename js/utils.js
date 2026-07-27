(() => {
function normalizeCitation(value) {
  const decoder = document.createElement("textarea");
  decoder.innerHTML = String(value);
  let text = decoder.value;

  const umlauts = {
    a: "ä",
    o: "ö",
    u: "ü",
    A: "Ä",
    O: "Ö",
    U: "Ü",
  };

  text = text
    .replace(/\{\\"\{([aouAOU])\}\}/g, (_, letter) => umlauts[letter])
    .replace(/\{\\"([aouAOU])\}/g, (_, letter) => umlauts[letter])
    .replace(/\\"\{([aouAOU])\}/g, (_, letter) => umlauts[letter])
    .replace(/\{\\ss\}/g, "ß")
    .replace(/\\ss\b/g, "ß")
    .replaceAll("Ã¤", "ä")
    .replaceAll("Ã¶", "ö")
    .replaceAll("Ã¼", "ü")
    .replaceAll("Ã„", "Ä")
    .replaceAll("Ã–", "Ö")
    .replaceAll("Ãœ", "Ü")
    .replaceAll("ÃŸ", "ß");

  return text.normalize("NFC").trim();
}

function stripMarkup(value) {
  const element = document.createElement("div");
  element.innerHTML = String(value);
  return (element.textContent || element.innerText || "")
    .normalize("NFC")
    .trim();
}

function extractDoi(value) {
  const match = value.match(/10\.\d{4,9}\/[-._;()/:a-z0-9]+/i);
  if (!match) return "";

  let doi = match[0].replace(/[.,;)\]}]+$/, "");
  if (/spiedigitallibrary\.org/i.test(value)) {
    doi = doi.replace(/\.(?:short|full)$/i, "");
  }
  return doi;
}

function extractIsbn(value) {
  const labeled = value.match(/ISBN(?:-1[03])?\s*:?\s*([0-9Xx -]{10,24})/i);
  const candidates = labeled
    ? [labeled[1]]
    : value
        .trim()
        .match(
          /(?:97[89][0-9 -]{10,20}[0-9]|[0-9][0-9 -]{8,16}[0-9Xx])/g,
        ) || [];

  for (const candidate of candidates) {
    const isbn = candidate.replace(/[^0-9Xx]/g, "").toUpperCase();
    if (isValidIsbn(isbn)) return isbn;
  }
  return "";
}

function normalizeUrl(value) {
  const candidate = /^www\./i.test(value.trim())
    ? `https://${value.trim()}`
    : value.trim();

  try {
    const url = new URL(candidate);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

function doiUrl(doi) {
  return `https://doi.org/${doi.split("/").map(encodeURIComponent).join("/")}`;
}

function safeDecode(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function normalizeAuthors(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return String(value)
    .split(/\s+(?:and|&)\s+|;\s*/i)
    .map((author) => author.trim())
    .filter(Boolean);
}

function extractYear(value) {
  const match = String(value || "").match(/\b(1[5-9]\d{2}|20\d{2}|2100)\b/);
  return match ? match[0] : "";
}

function cleanPageTitle(title, siteName) {
  let clean = String(title).replace(/\s+/g, " ").trim();
  const escapedSite = escapeRegExp(siteName || "");

  if (escapedSite) {
    clean = clean.replace(
      new RegExp(`\\s*[-|–—:]\\s*${escapedSite}\\s*$`, "i"),
      "",
    );
  }

  return clean.replace(
    /\s*[-|–—]\s*(Nature|ScienceDirect|SpringerLink|Wiley Online Library)\s*$/i,
    "",
  );
}

function titleSimilarity(first, second) {
  const a = titleTokens(first);
  const b = titleTokens(second);
  if (!a.size || !b.size) return 0;

  const intersection = [...a].filter((token) => b.has(token)).length;
  return (2 * intersection) / (a.size + b.size);
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isValidIsbn(isbn) {
  if (/^\d{13}$/.test(isbn)) {
    const sum = isbn
      .slice(0, 12)
      .split("")
      .reduce(
        (total, digit, index) =>
          total + Number(digit) * (index % 2 === 0 ? 1 : 3),
        0,
      );
    return (10 - (sum % 10)) % 10 === Number(isbn.at(-1));
  }

  if (/^\d{9}[\dX]$/.test(isbn)) {
    const sum = isbn.split("").reduce((total, digit, index) => {
      const digitValue = digit === "X" ? 10 : Number(digit);
      return total + digitValue * (10 - index);
    }, 0);
    return sum % 11 === 0;
  }

  return false;
}

function titleTokens(title) {
  const stopWords = new Set(["a", "an", "and", "of", "the", "to", "in", "for"]);
  return new Set(
    String(title)
      .toLowerCase()
      .replace(/<[^>]*>/g, "")
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .split(/\s+/)
      .filter((word) => word.length > 1 && !stopWords.has(word)),
  );
}

window.CiteApp = window.CiteApp || {};
window.CiteApp.utils = {
  normalizeCitation,
  stripMarkup,
  extractDoi,
  extractIsbn,
  normalizeUrl,
  doiUrl,
  safeDecode,
  normalizeAuthors,
  extractYear,
  cleanPageTitle,
  titleSimilarity,
  escapeRegExp,
};
})();
