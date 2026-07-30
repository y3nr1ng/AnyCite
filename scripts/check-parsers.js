global.window = global;
global.CiteApp = {};

require("../js/parsers.js");

const { parseKnownSource } = CiteApp.parsers;

const validCases = new Map([
  ["1706.03762", "1706.03762"],
  ["arXiv:1706.03762v7", "1706.03762"],
  ["https://arxiv.org/abs/1706.03762", "1706.03762"],
  ["https://www.arxiv.org/pdf/1706.03762v7.pdf", "1706.03762"],
  ["export.arxiv.org/html/2501.12345v2", "2501.12345"],
  ["https://arxiv.org/abs/hep-th/9901001", "hep-th/9901001"],
  ["arXiv:hep-th/9901001v2", "hep-th/9901001"],
  ["https://arxiv.org/abs/math.GT/0309136v1", "math/0309136"],
]);

for (const [input, expectedId] of validCases) {
  const source = parseKnownSource(input);
  if (source?.kind !== "arxiv" || source.id !== expectedId) {
    throw new Error(`Failed to parse arXiv source: ${input}`);
  }
  if (source.doi !== `10.48550/arXiv.${expectedId}`) {
    throw new Error(`Built the wrong arXiv DOI for: ${input}`);
  }
}

const invalidCases = [
  "https://example.com/abs/1706.03762",
  "1706.123",
  "10.48550/arXiv.1706.03762",
  "ordinary citation text",
];

for (const input of invalidCases) {
  if (parseKnownSource(input)) {
    throw new Error(`Incorrectly detected an arXiv source: ${input}`);
  }
}

console.log(
  `Known-source parser checks passed (${validCases.size + invalidCases.length} cases).`,
);
