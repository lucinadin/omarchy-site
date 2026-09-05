export function getNewsTitleTransitionName(slug: string) {
  return `news-title-${slug.replaceAll("/", "-")}`;
}
