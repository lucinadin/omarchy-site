import { resolve } from "node:path";

import { renderHomeOpenGraphImage } from "../lib/og/home-image";
import { fileExists, writeFileIfChanged } from "./write-file-if-changed";

const output = resolve(
  process.cwd(),
  process.argv.includes("--write") ? "public/assets/og/home.png" : "out/og-previews/home.png"
);
const force = process.argv.includes("--force");

if (!force && (await fileExists(output))) {
  console.log(`Skipped existing ${output}`);
} else {
  const response = renderHomeOpenGraphImage();
  const status = await writeFileIfChanged(output, Buffer.from(await response.arrayBuffer()));
  console.log(`${status === "written" ? "Rendered" : "Unchanged"} ${output}`);
}
