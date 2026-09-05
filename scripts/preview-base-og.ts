import { resolve } from "node:path";

import { renderBaseOpenGraphImage } from "../lib/og/base-image";
import { fileExists, writeFileIfChanged } from "./write-file-if-changed";

const output = resolve(
  process.cwd(),
  process.argv.includes("--write") ? "app/opengraph-image.png" : "out/og-previews/base.png"
);
const force = process.argv.includes("--force");

if (!force && (await fileExists(output))) {
  console.log(`Skipped existing ${output}`);
} else {
  const response = renderBaseOpenGraphImage();
  const status = await writeFileIfChanged(output, Buffer.from(await response.arrayBuffer()));
  console.log(`${status === "written" ? "Rendered" : "Unchanged"} ${output}`);
}
