import assert from "node:assert/strict";
import { test } from "node:test";

import { parseCuratedCommunityThemes } from "./source-list";

test("reads only canonical themes from the pinned upstream list", () => {
  const themes = parseCuratedCommunityThemes(`
<figure class="themes__theme">
  <a href="https://github.com/example/omarchy-cool-theme"><img src="/assets/themes/cool.webp" alt="Cool &amp; Quiet theme" loading="lazy" decoding="async"></a>
  <figcaption><a href="https://github.com/example/omarchy-cool-theme">Cool &amp; Quiet</a></figcaption>
</figure>`);

  assert.deepEqual(themes, [
    {
      image: "/assets/themes/cool.webp",
      name: "Cool & Quiet",
      repository: "https://github.com/example/omarchy-cool-theme",
    },
  ]);
});

test("refuses duplicate repositories and unsafe image paths", () => {
  const duplicate = `
<figure class="themes__theme">
  <a href="https://github.com/example/theme"><img src="/assets/themes/one.webp"></a>
  <figcaption><a href="https://github.com/example/theme">One</a></figcaption>
</figure>
<figure class="themes__theme">
  <a href="https://github.com/EXAMPLE/theme"><img src="/assets/themes/two.webp"></a>
  <figcaption><a href="https://github.com/EXAMPLE/theme">Two</a></figcaption>
</figure>`;
  assert.throws(() => parseCuratedCommunityThemes(duplicate), /repository is duplicated/u);

  const unsafeImage = `
<figure class="themes__theme">
  <a href="https://github.com/example/theme"><img src="https://example.com/theme.webp"></a>
  <figcaption><a href="https://github.com/example/theme">Theme</a></figcaption>
</figure>`;
  assert.throws(() => parseCuratedCommunityThemes(unsafeImage), /unsafe image path/u);
});
