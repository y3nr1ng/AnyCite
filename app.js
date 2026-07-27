(() => {
const { DEBOUNCE_MS } = window.CiteApp.config;
const {
  exportFileName,
  filterCitation,
  formatMetadata,
  metadataToBibTeX,
  metadataToRis,
  replaceStyleLabel,
} = window.CiteApp.formatters;
const {
  fetchDoiCitation,
  fetchDoiExport,
  fetchDoiMetadata,
  fetchOpenLibraryBook,
  fetchPageMetadata,
  findCrossrefBook,
  findCrossrefByCitation,
  findCrossrefByTitle,
} = window.CiteApp.services;
const { ui } = window.CiteApp;
const {
  doiUrl,
  extractDoi,
  extractIsbn,
  normalizeCitation,
  normalizeUrl,
  safeDecode,
  stripMarkup,
} = window.CiteApp.utils;

class CitationApp {
  constructor() {
    this.debounceTimer = null;
    this.activeController = null;
    this.requestId = 0;
    this.lastResolved = null;
    this.visibleElements = {
      title: true,
      doi: false,
    };
  }

  init() {
    ui.bind({
      onSourceChange: () => this.queueLookup(),
      onStyleChange: () => this.regenerateCitation(),
      onDownload: (format, button) =>
        this.downloadCitationFile(format, button),
      onElementToggle: (element) => this.toggleElement(element),
    });
  }

  queueLookup() {
    window.clearTimeout(this.debounceTimer);
    this.cancelRequest();
    this.lastResolved = null;

    ui.clearCitation();
    ui.setDownloadsEnabled(false);
    ui.setElementButtonsEnabled(null);
    ui.setResultMeta("");
    ui.clearCitationState();

    const value = ui.sourceValue();
    if (!value) {
      ui.setSourceMeta("");
      ui.resetSourceKind();
      return;
    }

    ui.resetSourceKind();
    ui.setSourceMeta("Detecting source type…");
    ui.showSearching("Identifying your source…");
    this.debounceTimer = window.setTimeout(
      () => this.resolveInput(value),
      DEBOUNCE_MS,
    );
  }

  async resolveInput(value) {
    const doi = extractDoi(safeDecode(value));
    if (doi) {
      ui.showSourceKind("DOI", "doi");
      await this.resolveDoi(doi, "DOI detected");
      return;
    }

    const url = normalizeUrl(value);
    if (url) {
      ui.showSourceKind("URL", "url");
      await this.resolvePublisherUrl(url);
      return;
    }

    const isbn = extractIsbn(value);
    if (isbn) {
      ui.showSourceKind("ISBN", "isbn");
      await this.resolveIsbn(isbn);
      return;
    }

    if (value.length < 20) {
      ui.showSourceKind("Text", "text");
      ui.setSourceMeta("More information needed");
      ui.showMessage("Add a DOI, ISBN, URL, or a fuller citation.");
      return;
    }

    ui.showSourceKind("Citation", "citation");
    await this.resolveExistingCitation(value);
  }

  async resolveDoi(doi, detectedAs, originalUrl = "") {
    ui.setSourceMeta(detectedAs);
    const controller = this.beginRequest("Looking up DOI metadata…");

    try {
      const citation = await fetchDoiCitation(
        doi,
        ui.styleValue(),
        controller.signal,
      );
      const metadata = await fetchDoiMetadata(doi, controller.signal).catch(
        () => null,
      );
      if (!this.isCurrent(controller)) return;

      this.finishCitation(citation, {
        kind: "doi",
        doi,
        title: metadata?.title || "",
        url: originalUrl || doiUrl(doi),
        label: `${detectedAs} · ${ui.styleLabel()}`,
      });
    } catch (error) {
      this.handleFailure(error, controller);
    }
  }

  async resolveIsbn(isbn) {
    ui.setSourceMeta(`ISBN ${isbn}`);
    const controller = this.beginRequest("Looking up this book…");

    try {
      const crossrefItem = await findCrossrefBook(isbn, controller.signal);
      if (crossrefItem?.DOI) {
        const citation = await fetchDoiCitation(
          crossrefItem.DOI,
          ui.styleValue(),
          controller.signal,
        );
        if (!this.isCurrent(controller)) return;

        this.finishCitation(citation, {
          kind: "doi",
          doi: crossrefItem.DOI,
          title: crossrefItem.title?.[0] || "",
          url: doiUrl(crossrefItem.DOI),
          label: `ISBN · Crossref book · ${ui.styleLabel()}`,
        });
        return;
      }

      const metadata = await fetchOpenLibraryBook(isbn, controller.signal);
      if (!this.isCurrent(controller)) return;

      this.finishCitation(formatMetadata(metadata, ui.styleValue()), {
        kind: "metadata",
        metadata,
        url: metadata.url,
        label: `ISBN · Open Library · ${ui.styleLabel()}`,
      });
    } catch (error) {
      this.handleFailure(error, controller);
    }
  }

  async resolvePublisherUrl(url) {
    const domain = new URL(url).hostname.replace(/^www\./, "");
    ui.setSourceMeta(`${domain} · Publisher page`);
    const controller = this.beginRequest("Reading the publisher page…");

    try {
      const metadata = await fetchPageMetadata(url, controller.signal);
      ui.showSearching("Matching the article title…");
      const crossrefItem = await findCrossrefByTitle(
        metadata.title,
        controller.signal,
      );

      if (crossrefItem?.DOI) {
        const citation = await fetchDoiCitation(
          crossrefItem.DOI,
          ui.styleValue(),
          controller.signal,
        );
        if (!this.isCurrent(controller)) return;

        this.finishCitation(citation, {
          kind: "doi",
          doi: crossrefItem.DOI,
          title: crossrefItem.title?.[0] || metadata.title,
          url,
          label: `Publisher page · Crossref match · ${ui.styleLabel()}`,
        });
        return;
      }

      if (!this.isCurrent(controller)) return;
      this.finishCitation(formatMetadata(metadata, ui.styleValue()), {
        kind: "metadata",
        metadata,
        url,
        label: `Publisher page · Web metadata · ${ui.styleLabel()}`,
      });
    } catch (error) {
      this.handleFailure(error, controller);
    }
  }

  async resolveExistingCitation(citation) {
    ui.setSourceMeta("Existing citation detected");
    const controller = this.beginRequest("Matching the cited work…");

    try {
      const item = await findCrossrefByCitation(citation, controller.signal);
      const formatted = await fetchDoiCitation(
        item.DOI,
        ui.styleValue(),
        controller.signal,
      );
      if (!this.isCurrent(controller)) return;

      this.finishCitation(formatted, {
        kind: "doi",
        doi: item.DOI,
        title: item.title?.[0] || "",
        url: doiUrl(item.DOI),
        label: `Reformatted citation · ${ui.styleLabel()}`,
      });
    } catch (error) {
      this.handleFailure(error, controller);
    }
  }

  async regenerateCitation() {
    if (!this.lastResolved) return;

    const resolved = this.lastResolved;
    ui.clearCitation();
    ui.showSearching(`Reformatting as ${ui.styleLabel()}…`);

    if (resolved.kind === "metadata") {
      await new Promise((resolve) => window.setTimeout(resolve, 180));
      if (this.lastResolved !== resolved) return;
      this.finishCitation(
        formatMetadata(resolved.metadata, ui.styleValue()),
        {
          ...resolved,
          label: replaceStyleLabel(resolved.label, ui.styleLabel()),
        },
      );
      return;
    }

    const controller = this.beginRequest(
      `Reformatting as ${ui.styleLabel()}…`,
    );
    try {
      const citation = await fetchDoiCitation(
        resolved.doi,
        ui.styleValue(),
        controller.signal,
      );
      if (!this.isCurrent(controller)) return;
      this.finishCitation(citation, {
        ...resolved,
        label: replaceStyleLabel(resolved.label, ui.styleLabel()),
      });
    } catch (error) {
      this.handleFailure(error, controller);
    }
  }

  toggleElement(element) {
    this.visibleElements[element] = !this.visibleElements[element];
    ui.setElementActive(element, this.visibleElements[element]);
    this.renderCitation();
  }

  renderCitation() {
    if (!this.lastResolved?.baseCitation) {
      ui.clearCitation();
      return;
    }

    ui.renderCitation(
      filterCitation(
        this.lastResolved.baseCitation,
        this.lastResolved,
        this.visibleElements,
      ),
    );
  }

  finishCitation(citation, resolved) {
    this.lastResolved = {
      ...resolved,
      title: stripMarkup(resolved.title || resolved.metadata?.title || ""),
      baseCitation: normalizeCitation(citation),
    };

    ui.setResultMeta(resolved.label);
    ui.setDownloadsEnabled(true);
    ui.setElementButtonsEnabled(this.lastResolved);
    this.renderCitation();
    ui.clearCitationState();
    ui.animateCitation();
  }

  beginRequest(message) {
    this.cancelRequest();
    const controller = new AbortController();
    controller.requestId = ++this.requestId;
    this.activeController = controller;
    ui.showSearching(message);
    return controller;
  }

  cancelRequest() {
    this.activeController?.abort();
    this.activeController = null;
  }

  isCurrent(controller) {
    return (
      this.activeController === controller &&
      controller.requestId === this.requestId
    );
  }

  handleFailure(error, controller) {
    if (error.name === "AbortError" || !this.isCurrent(controller)) return;

    const messages = {
      DOI_NOT_FOUND:
        "No record was found for that DOI. Check the identifier and try again.",
      ISBN_NOT_FOUND: "No book record was found for that ISBN.",
      PAGE_UNAVAILABLE:
        "That page’s metadata could not be read. Try its DOI or paste the existing citation.",
      NO_MATCH:
        "The citation could not be matched. Add the title, author, journal, and year.",
    };
    const message = !navigator.onLine
      ? "You appear to be offline. Reconnect to search metadata."
      : messages[error.message] ||
        "The metadata services aren’t responding. Please try again.";

    ui.setResultMeta("");
    ui.setDownloadsEnabled(false);
    ui.setElementButtonsEnabled(null);
    ui.showMessage(message);
  }

  async downloadCitationFile(format, button) {
    const resolved = this.lastResolved;
    if (!resolved) return;

    ui.setDownloadBusy(button, true);
    try {
      const content =
        resolved.kind === "doi"
          ? await fetchDoiExport(resolved.doi, format)
          : format === "bib"
            ? metadataToBibTeX(resolved.metadata)
            : metadataToRis(resolved.metadata);
      const extension = format === "bib" ? "bib" : "ris";
      const mime =
        format === "bib"
          ? "application/x-bibtex;charset=utf-8"
          : "application/x-research-info-systems;charset=utf-8";

      ui.downloadTextFile(
        content,
        `${exportFileName(resolved)}.${extension}`,
        mime,
      );
    } catch {
      const previous = resolved.label;
      ui.setResultMeta("Download failed — please try again");
      window.setTimeout(() => {
        if (this.lastResolved === resolved) ui.setResultMeta(previous);
      }, 2200);
    } finally {
      ui.setDownloadBusy(
        button,
        false,
        this.lastResolved === resolved,
      );
    }
  }
}

new CitationApp().init();
})();
