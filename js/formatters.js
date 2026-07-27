(() => {
const { STYLE_LABELS } = window.CiteApp.config;
const { escapeRegExp, stripMarkup } = window.CiteApp.utils;

function formatMetadata(metadata, style) {
  const title = metadata.title || "Untitled source";
  const year = metadata.year || "n.d.";
  const publisher = metadata.publisher || "";
  const url = metadata.url || "";
  const isWeb = metadata.type === "web";

  if (style === "modern-language-association") {
    const author = formatAuthors(metadata.authors, "mla");
    if (isWeb) {
      return joinCitation([
        author ? `${author}.` : "",
        `“${title}.”`,
        publisher ? `${publisher},` : "",
        metadata.year ? `${metadata.year},` : "",
        url ? `${url}.` : "",
      ]);
    }
    return joinCitation([
      author ? `${author}.` : "",
      `${title}.`,
      publisher ? `${publisher},` : "",
      metadata.year ? `${metadata.year}.` : "",
    ]);
  }

  if (style === "chicago-author-date") {
    const author = formatAuthors(metadata.authors, "chicago");
    return joinCitation([
      author ? `${author}.` : "",
      `${year}.`,
      isWeb ? `“${title}.”` : `${title}.`,
      publisher ? `${publisher}.` : "",
      isWeb && url ? url : "",
    ]);
  }

  if (style === "harvard-cite-them-right") {
    const author = formatAuthors(metadata.authors, "harvard");
    return joinCitation([
      author || publisher || "",
      `(${year})`,
      isWeb ? `‘${title}’,` : `${title}.`,
      publisher && author ? `${publisher}.` : "",
      isWeb && url ? `Available at: ${url}.` : "",
    ]);
  }

  if (style === "elsevier-vancouver") {
    const author = formatAuthors(metadata.authors, "vancouver");
    return joinCitation([
      author ? `${author}.` : "",
      `${title}${isWeb ? " [Internet]" : ""}.`,
      publisher ? `${publisher};` : "",
      metadata.year ? `${metadata.year}.` : "",
      isWeb && url ? `Available from: ${url}` : "",
    ]);
  }

  if (style === "american-chemical-society") {
    const author = formatAuthors(metadata.authors, "acs");
    if (isWeb) {
      return joinCitation([
        author ? asSentence(author) : "",
        `${title}.`,
        publisher ? `${publisher}.` : "",
        url,
      ]);
    }
    return joinCitation([
      author ? asSentence(author) : "",
      `${title};`,
      publisher ? `${publisher},` : "",
      metadata.year ? `${metadata.year}.` : "",
    ]);
  }

  const author = formatAuthors(metadata.authors, "apa");
  return joinCitation([
    author ? asSentence(author) : publisher ? asSentence(publisher) : "",
    `(${year}).`,
    `${title}.`,
    publisher && author ? `${publisher}.` : "",
    isWeb && url ? url : "",
  ]);
}

function filterCitation(baseCitation, resolved, visibleElements) {
  let citation = removeLeadingCitationNumber(baseCitation);

  if (!visibleElements.title && resolved.title) {
    citation = removeCitationTitle(citation, resolved.title);
  }
  if (!visibleElements.doi && resolved.doi) {
    citation = removeCitationDoi(citation, resolved.doi);
  }

  return tidyCitation(citation);
}

function removeLeadingCitationNumber(citation) {
  return citation.replace(
    /^\s*(?:\(\s*\d+\s*\)|\[\s*\d+\s*\]|\d+\s*[.)])\s*/,
    "",
  );
}

function formatCitationDisplay(citation, resolved, style) {
  const text = applyJournalAbbreviation(
    tidyCitation(citation),
    resolved.metadata,
    style,
  );
  if (
    style !== "american-chemical-society" ||
    !resolved.metadata
  ) {
    return { text, html: escapeHtml(text) };
  }

  return {
    text,
    html: formatAcsHtml(text, resolved.metadata),
  };
}

function metadataToBibTeX(metadata) {
  const type = metadata.type === "book" ? "book" : "misc";
  const firstAuthor = metadata.authors?.[0]
    ? parseName(metadata.authors[0]).family
    : "source";
  const key = `${firstAuthor}${metadata.year || ""}`
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/gi, "");
  const fields = [
    ["title", metadata.title],
    ["author", metadata.authors?.join(" and ")],
    ["year", metadata.year],
    ["publisher", metadata.publisher],
    ["isbn", metadata.isbn],
    ["url", metadata.url],
  ].filter(([, value]) => value);

  const body = fields
    .map(([name, value]) => `  ${name} = {${escapeBibTeX(value)}}`)
    .join(",\n");
  return `@${type}{${key || "source"},\n${body}\n}`;
}

function metadataToRis(metadata) {
  const lines = [
    `TY  - ${metadata.type === "book" ? "BOOK" : "ELEC"}`,
    ...(metadata.authors || []).map((author) => `AU  - ${author}`),
    `TI  - ${metadata.title || "Untitled source"}`,
    metadata.year ? `PY  - ${metadata.year}` : "",
    metadata.publisher ? `PB  - ${metadata.publisher}` : "",
    metadata.isbn ? `SN  - ${metadata.isbn}` : "",
    metadata.url ? `UR  - ${metadata.url}` : "",
    "ER  - ",
  ];
  return lines.filter(Boolean).join("\r\n");
}

function exportFileName(resolved) {
  const value =
    resolved.metadata?.title || resolved.doi?.split("/").at(-1) || "citation";
  const slug = String(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
    .slice(0, 72);
  return slug || "citation";
}

function replaceStyleLabel(label, nextStyleLabel) {
  let updated = label;
  STYLE_LABELS.forEach((style) => {
    updated = updated.replace(style, nextStyleLabel);
  });
  return updated;
}

function formatAuthors(authors = [], style) {
  const names = authors.filter(Boolean);
  if (!names.length) return "";

  const parsed = names.map(parseName);
  if (style === "acs") {
    return parsed
      .map((name) => `${name.family}, ${initials(name.given, true)}`.trim())
      .join("; ");
  }
  if (style === "vancouver") {
    return parsed
      .map((name) => `${name.family} ${initials(name.given, false)}`.trim())
      .join(", ");
  }
  if (style === "apa" || style === "harvard") {
    const formatted = parsed.map(
      (name) => `${name.family}, ${initials(name.given, true)}`.trim(),
    );
    if (formatted.length === 1) return formatted[0];
    return `${formatted.slice(0, -1).join(", ")}, & ${formatted.at(-1)}`;
  }

  const formatted = parsed.map((name, index) =>
    index === 0
      ? `${name.family}, ${name.given}`.trim()
      : `${name.given} ${name.family}`.trim(),
  );
  if (formatted.length === 1) return formatted[0];
  return `${formatted.slice(0, -1).join(", ")}, and ${formatted.at(-1)}`;
}

function parseName(name) {
  if (name.includes(",")) {
    const [family, ...given] = name.split(",");
    return { family: family.trim(), given: given.join(",").trim() };
  }
  const parts = name.trim().split(/\s+/);
  return {
    family: parts.pop() || "",
    given: parts.join(" "),
  };
}

function initials(given, periods) {
  return given
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${periods ? "." : ""}`)
    .join(periods ? " " : "");
}

function removeCitationTitle(citation, title) {
  const normalizedTitle = stripMarkup(title).trim();
  if (!normalizedTitle) return citation;

  const pattern = normalizedTitle
    .split(/\s+/)
    .map(escapeRegExp)
    .join("\\s+");
  return citation.replace(
    new RegExp(`(?:[“"'‘’])?${pattern}(?:[”"'‘’])?[.]?\\s*`, "iu"),
    "",
  );
}

function removeCitationDoi(citation, doi) {
  const escapedDoi = escapeRegExp(doi);
  return citation
    .replace(
      new RegExp(
        `\\s*(?:(?:Available (?:at|from)|Retrieved from):\\s*)?(?:https?://(?:dx\\.)?doi\\.org/|doi:\\s*)${escapedDoi}[.]?`,
        "giu",
      ),
      "",
    )
    .replace(new RegExp(`\\s+${escapedDoi}[.]?`, "giu"), "");
}

function tidyCitation(citation) {
  return citation
    .replace(
      /\s*(?:Available (?:at|from)|Retrieved from):\s*$/i,
      "",
    )
    .replace(/\.\s+Edited by\s*,\s*(?=\d)/gi, ", ")
    .replace(/\s+Edited by\s*,\s*(?=\d)/gi, " ")
    .replace(/\s+([,;:.])/g, "$1")
    .replace(/([.])\s*\1+/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function joinCitation(parts) {
  return parts.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}

function asSentence(value) {
  return `${String(value).replace(/[.,;:]+$/, "")}.`;
}

function escapeBibTeX(value) {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/\{/g, "\\{")
    .replace(/\}/g, "\\}");
}

function formatAcsHtml(citation, metadata) {
  const type = metadata.type === "web" ? "webpage" : metadata.type;
  const ranges = [];
  const journalTypes = new Set([
    "article-journal",
    "journal-article",
    "review",
  ]);
  const bookTypes = new Set([
    "bill",
    "book",
    "graphic",
    "legal_case",
    "legislation",
    "motion_picture",
    "report",
    "song",
  ]);
  const chapterTypes = new Set([
    "chapter",
    "paper-conference",
    "entry-dictionary",
    "entry-encyclopedia",
  ]);

  if (journalTypes.has(type)) {
    const container = findLastRange(
      citation,
      [
        metadata.journalAbbreviation,
        metadata.containerTitleShort,
        metadata.containerTitle,
      ],
    );
    if (container) ranges.push({ ...container, tag: "em" });

    const year = findFirstRange(
      citation,
      [metadata.year],
      container?.end || 0,
    );
    if (year) ranges.push({ ...year, tag: "strong" });

    const volume = findFirstRange(
      citation,
      [metadata.volume],
      year?.end || container?.end || 0,
    );
    if (volume) ranges.push({ ...volume, tag: "em" });
  } else if (bookTypes.has(type)) {
    addEmphasisRange(ranges, citation, [
      metadata.title,
    ]);
  } else if (chapterTypes.has(type)) {
    addEmphasisRange(ranges, citation, [
      metadata.containerTitle,
      metadata.containerTitleShort,
    ]);
  } else if (type === "webpage" || type === "post" || type === "post-weblog") {
    addEmphasisRange(ranges, citation, [metadata.title]);
  } else {
    addEmphasisRange(ranges, citation, [
      metadata.containerTitle,
      metadata.containerTitleShort,
    ]);
    const volume = findLastRange(citation, [metadata.volume]);
    if (volume) ranges.push({ ...volume, tag: "em" });
  }

  return rangesToHtml(citation, ranges);
}

function applyJournalAbbreviation(citation, metadata, style) {
  if (
    !metadata?.containerTitle ||
    !metadata.journalAbbreviation ||
    ![
      "american-chemical-society",
      "elsevier-vancouver",
    ].includes(style)
  ) {
    return citation;
  }

  const fullTitle = findLastRange(citation, [
    metadata.containerTitle,
  ]);
  if (!fullTitle) return citation;

  return [
    citation.slice(0, fullTitle.start),
    metadata.journalAbbreviation,
    citation.slice(fullTitle.end),
  ].join("");
}

function addEmphasisRange(ranges, citation, candidates) {
  const range = findLastRange(citation, candidates);
  if (range) ranges.push({ ...range, tag: "em" });
}

function findFirstRange(citation, candidates, from = 0) {
  const lowerCitation = citation.toLocaleLowerCase();
  let selected = null;

  uniqueTerms(candidates).forEach((candidate) => {
    const start = lowerCitation.indexOf(
      candidate.toLocaleLowerCase(),
      from,
    );
    if (start < 0) return;
    if (!selected || start < selected.start) {
      selected = { start, end: start + candidate.length };
    }
  });
  return selected;
}

function findLastRange(citation, candidates, before = citation.length) {
  const lowerCitation = citation.toLocaleLowerCase();
  let selected = null;

  uniqueTerms(candidates).forEach((candidate) => {
    const start = lowerCitation.lastIndexOf(
      candidate.toLocaleLowerCase(),
      Math.max(0, before - candidate.length),
    );
    if (start < 0) return;
    if (!selected || start > selected.start) {
      selected = { start, end: start + candidate.length };
    }
  });
  return selected;
}

function uniqueTerms(candidates) {
  return [...new Set(candidates.filter(Boolean).map(String))].sort(
    (first, second) => second.length - first.length,
  );
}

function rangesToHtml(citation, ranges) {
  const sorted = ranges
    .filter(
      (range, index, all) =>
        range.start < range.end &&
        !all.some(
          (other, otherIndex) =>
            otherIndex !== index &&
            other.start <= range.start &&
            other.end >= range.end &&
            other.end - other.start > range.end - range.start,
        ),
    )
    .sort((first, second) => first.start - second.start);
  let cursor = 0;
  let html = "";

  sorted.forEach((range) => {
    if (range.start < cursor) return;
    html += escapeHtml(citation.slice(cursor, range.start));
    html += `<${range.tag}>${escapeHtml(
      citation.slice(range.start, range.end),
    )}</${range.tag}>`;
    cursor = range.end;
  });

  return html + escapeHtml(citation.slice(cursor));
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

window.CiteApp.formatters = {
  formatMetadata,
  filterCitation,
  formatCitationDisplay,
  metadataToBibTeX,
  metadataToRis,
  exportFileName,
  replaceStyleLabel,
};
})();
