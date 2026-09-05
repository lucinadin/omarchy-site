import { siteBrand } from "@/lib/site-brand";

export const heyUrl = "https://www.hey.com/";
export const omarchyDonateUrl = "https://donate.omarchy.org";
export const omarchyGithubUrl = "https://github.com/omacom/omarchy";
export const omarchyIsoDownloadUrl = "https://iso.omarchy.org/omarchy-4.0.2.iso";

export function absoluteUrl(path: string) {
  return new URL(path, siteBrand.url).toString();
}
