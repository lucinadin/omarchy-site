export const siteBrand = {
  author: "DHH",
  authorUrl: "https://dhh.dk",
  descriptor: "Beautiful, Fun & Agentic Linux",
  name: "Omarchy",
  url: "https://omarchy.org",
} as const;

export const siteTagline = `${siteBrand.descriptor} by ${siteBrand.author}`;
export const siteTitle = `${siteBrand.name} — ${siteTagline}`;
