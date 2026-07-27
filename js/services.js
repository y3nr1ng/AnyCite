(() => {
const { BOOK_TYPES, CROSSREF_FIELDS } = window.CiteApp.config;
const {
  cleanPageTitle,
  doiUrl,
  extractYear,
  normalizeAuthors,
  normalizeCitation,
  stripMarkup,
  titleSimilarity,
} = window.CiteApp.utils;

async function fetchDoiCitation(doi, style, signal) {
  const response = await fetch(doiUrl(doi), {
    signal,
    headers: {
      Accept: `text/x-bibliography; style=${style}`,
    },
  });

  if (response.status === 404) throw new Error("DOI_NOT_FOUND");
  if (!response.ok) throw new Error("SERVICE_ERROR");

  const citation = (await response.text()).trim();
  if (!citation) throw new Error("DOI_NOT_FOUND");
  return normalizeCitation(citation);
}

async function fetchDoiMetadata(doi, signal) {
  const response = await fetch(doiUrl(doi), {
    signal,
    headers: {
      Accept: "application/vnd.citationstyles.csl+json",
    },
  });

  if (!response.ok) throw new Error("SERVICE_ERROR");
  const metadata = await response.json();
  const issued = metadata.issued?.["date-parts"]?.[0] || [];
  return {
    type: metadata.type || "",
    title: stripMarkup(metadata.title || ""),
    authors: (metadata.author || [])
      .map((author) =>
        author.literal ||
        [author.given, author.family].filter(Boolean).join(" "),
      )
      .filter(Boolean),
    year: issued[0] ? String(issued[0]) : "",
    containerTitle: stripMarkup(metadata["container-title"] || ""),
    containerTitleShort: stripMarkup(
      metadata["container-title-short"] || "",
    ),
    volume: String(metadata.volume || ""),
    issue: String(metadata.issue || ""),
    pages: String(metadata.page || ""),
    publisher: stripMarkup(metadata.publisher || ""),
    publisherPlace: stripMarkup(metadata["publisher-place"] || ""),
    edition: String(metadata.edition || ""),
    doi: metadata.DOI || doi,
    url: metadata.URL || doiUrl(doi),
  };
}

async function findCrossrefBook(isbn, signal) {
  const params = new URLSearchParams({
    filter: `isbn:${isbn}`,
    rows: "10",
    select: CROSSREF_FIELDS,
  });
  const items = await fetchCrossrefItems(params, signal);
  return items.find((item) => BOOK_TYPES.has(item.type)) || null;
}

async function fetchOpenLibraryBook(isbn, signal) {
  const response = await fetch(
    `https://openlibrary.org/isbn/${encodeURIComponent(isbn)}.json`,
    { signal, headers: { Accept: "application/json" } },
  );

  if (response.status === 404) throw new Error("ISBN_NOT_FOUND");
  if (!response.ok) throw new Error("SERVICE_ERROR");

  const book = await response.json();
  const authorRefs = (book.authors || []).slice(0, 8);
  const authors = await Promise.all(
    authorRefs.map(async (author) => {
      const authorResponse = await fetch(
        `https://openlibrary.org${author.key}.json`,
        { signal, headers: { Accept: "application/json" } },
      );
      if (!authorResponse.ok) return "";
      const authorData = await authorResponse.json();
      return authorData.name || "";
    }),
  );

  return {
    type: "book",
    title: [book.title, book.subtitle].filter(Boolean).join(": "),
    authors: authors.filter(Boolean),
    year: extractYear(book.publish_date),
    publisher: book.publishers?.[0] || "",
    isbn,
    url: `https://openlibrary.org/isbn/${encodeURIComponent(isbn)}`,
  };
}

async function fetchPageMetadata(url, signal) {
  const endpoint = `https://api.microlink.io/?url=${encodeURIComponent(url)}`;
  const response = await fetch(endpoint, {
    signal,
    headers: { Accept: "application/json" },
  });

  if (!response.ok) throw new Error("PAGE_UNAVAILABLE");
  const payload = await response.json();
  if (payload.status !== "success" || !payload.data?.title) {
    throw new Error("PAGE_UNAVAILABLE");
  }

  const data = payload.data;
  const siteName = data.publisher || data.siteName || new URL(url).hostname;
  return {
    type: "web",
    title: cleanPageTitle(data.title, siteName),
    authors: normalizeAuthors(data.author),
    year: extractYear(data.date || data.publishedTime),
    publisher: siteName,
    url: data.url || url,
  };
}

async function findCrossrefByTitle(title, signal) {
  const params = new URLSearchParams({
    "query.title": title,
    rows: "5",
    select: CROSSREF_FIELDS,
  });
  const items = await fetchCrossrefItems(params, signal);
  let bestItem = null;
  let bestSimilarity = 0;

  items.forEach((item) => {
    const similarity = titleSimilarity(title, item.title?.[0] || "");
    if (similarity > bestSimilarity) {
      bestSimilarity = similarity;
      bestItem = item;
    }
  });

  return bestSimilarity >= 0.62 ? bestItem : null;
}

async function findCrossrefByCitation(citation, signal) {
  const params = new URLSearchParams({
    "query.bibliographic": citation,
    rows: "1",
    select: CROSSREF_FIELDS,
  });
  const items = await fetchCrossrefItems(params, signal, true);
  const item = items[0];

  if (!item?.DOI) throw new Error("NO_MATCH");
  return item;
}

async function fetchDoiExport(doi, format) {
  const accept =
    format === "bib"
      ? "application/x-bibtex"
      : "application/x-research-info-systems";
  const response = await fetch(doiUrl(doi), {
    headers: { Accept: accept },
  });

  if (!response.ok) throw new Error("DOWNLOAD_ERROR");
  return (await response.text()).trim();
}

async function fetchCrossrefItems(params, signal, strict = false) {
  const response = await fetch(`https://api.crossref.org/works?${params}`, {
    signal,
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    if (strict) throw new Error("SERVICE_ERROR");
    return [];
  }

  const data = await response.json();
  return data.message?.items || [];
}

window.CiteApp.services = {
  fetchDoiCitation,
  fetchDoiMetadata,
  findCrossrefBook,
  fetchOpenLibraryBook,
  fetchPageMetadata,
  findCrossrefByTitle,
  findCrossrefByCitation,
  fetchDoiExport,
};
})();
