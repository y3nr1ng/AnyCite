# Any | Cite

A single-screen, browser-based tool that turns a DOI, ISBN, arXiv identifier,
publisher URL, or existing citation into a formatted citation.

## Run locally

The app is static, so you can use any local web server:

```powershell
npx serve .
```

Then open the URL printed in the terminal.

You can also open `index.html` directly; the browser scripts do not require a
build step.

## Project structure

- `app.js` coordinates input detection, lookups, formatting, and UI state.
- `js/parsers.js` identifies sources with deterministic URL or identifier
  formats before generic detection runs.
- `js/services.js` contains all external API requests.
- `js/formatters.js` builds citations and BIB/RIS exports.
- `js/ui.js` owns DOM access, events, status updates, and downloads.
- `js/utils.js` contains parsing, normalization, and matching helpers.
- `js/config.js` contains shared constants and style labels.

## How it works

- DOI and existing-citation lookups use Crossref and DOI.org content
  negotiation.
- arXiv abstract, PDF, HTML, format, and source URLs—as well as bare modern and
  legacy arXiv identifiers—are parsed directly. Their canonical arXiv DOI is
  used for citation metadata and downloads, so no title matching is needed.
- ISBN lookup uses Crossref first, then Open Library for edition metadata.
- Publisher URLs with embedded DOIs use the DOI directly. Other URLs use
  Microlink to read page metadata, then match the title in Crossref.
- No API key or server-side component is required.
- ACS display formatting follows the
  [MyBib ACS citation generator](https://www.mybib.com/tools/acs-citation-generator)
  and the ACS CSL rules: journal titles and volumes are italicized, while
  publication years are bold. Rich formatting is preserved when supported by
  the copy destination.
- ACS and Vancouver journal abbreviations use publisher/Crossref short-title
  metadata first. Vancouver and missing-short-title cases use the
  [NLM Catalog](https://www.ncbi.nlm.nih.gov/nlmcatalog) by ISSN as a cached
  fallback. Harvard and other full-title styles are left unchanged.

Title and citation matching is probabilistic. Publisher-page metadata lookup
also depends on Microlink's public free tier. Always verify a generated citation
before using it.

## Development workflow

This repository follows GitHub Flow:

1. Create a short-lived branch from `main`.
2. Open a pull request and wait for the validation check to pass.
3. Merge into `main`.
4. The Pages workflow validates and publishes the updated site automatically.
