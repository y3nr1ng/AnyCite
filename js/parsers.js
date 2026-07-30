(() => {
const ARXIV_HOSTS = new Set([
  "arxiv.org",
  "www.arxiv.org",
  "export.arxiv.org",
]);

const knownSourceParsers = [parseArxivSource];

function parseKnownSource(value) {
  for (const parser of knownSourceParsers) {
    const source = parser(value);
    if (source) return source;
  }
  return null;
}

function parseArxivSource(value) {
  const id = extractArxivId(value);
  if (!id) return null;

  return {
    kind: "arxiv",
    id,
    doi: `10.48550/arXiv.${id}`,
    url: `https://arxiv.org/abs/${id}`,
  };
}

function extractArxivId(value) {
  const input = String(value || "").trim();
  if (!input) return "";

  const urlId = extractArxivUrlId(input);
  return normalizeArxivId(urlId || input);
}

function extractArxivUrlId(value) {
  const candidate = /^(?:(?:www|export)\.)?arxiv\.org\//i.test(value)
    ? `https://${value}`
    : value;

  try {
    const url = new URL(candidate);
    if (!ARXIV_HOSTS.has(url.hostname.toLowerCase())) return "";

    const path = decodeURIComponent(url.pathname);
    const match = path.match(
      /^\/(?:abs|pdf|html|format|src)\/(.+?)(?:\/)?$/i,
    );
    return match?.[1] || "";
  } catch {
    return "";
  }
}

function normalizeArxivId(value) {
  const candidate = String(value)
    .trim()
    .replace(/^arxiv\s*:\s*/i, "")
    .replace(/\.pdf$/i, "")
    .replace(/v\d+$/i, "");

  if (/^\d{4}\.\d{4,5}$/.test(candidate)) {
    return candidate;
  }

  const legacy = candidate.match(
    /^([a-z][a-z0-9.-]*)\/(\d{7})$/i,
  );
  if (!legacy) return "";

  const archive = legacy[1].replace(/\.[a-z]{2}$/i, "");
  return `${archive.toLowerCase()}/${legacy[2]}`;
}

window.CiteApp = window.CiteApp || {};
window.CiteApp.parsers = {
  parseKnownSource,
  extractArxivId,
};
})();
