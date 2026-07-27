# Changelog

All notable changes to Any | Cite are documented here.

## [1.1.0] - 2026-07-27

### Added

- Render ACS citations with journal titles and volumes in italics and publication
  years in bold.
- Resolve standardized journal abbreviations from publisher, Crossref, and NLM
  metadata for ACS and Vancouver citations.

### Fixed

- Remove leading reference numbers supplied by upstream citation formatters.
- Remove empty DOI access labels when the DOI element is hidden.
- Remove empty `Edited by` labels from Harvard citations while preserving named
  editors.

## [1.0.0] - 2026-07-27

### Added

- Launch the modular Any | Cite single-page application.
- Detect DOI, ISBN, publisher URL, and existing citation inputs.
- Generate citations in APA, MLA, Chicago, Harvard, Vancouver, and ACS styles.
- Export source metadata as BIB and RIS files.
- Validate pull requests and deploy updates from `main` to GitHub Pages.

[1.1.0]: https://github.com/y3nr1ng/AnyCite/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/y3nr1ng/AnyCite/releases/tag/v1.0.0
