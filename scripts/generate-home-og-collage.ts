import { spawn } from "node:child_process";
import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve as resolvePath } from "node:path";

import {
  getOfficialThemeWallpaper,
  omarchyThemes,
  type OmarchyThemeId,
} from "../lib/themes/official";
import { fileExists, writeFileIfChanged } from "./write-file-if-changed";

type Panel = {
  brightness: number;
  gravity: "center" | "east" | "west";
  polygon: string;
  themeId: OmarchyThemeId;
};

const scriptDirectory = import.meta.dirname;
const projectRoot = resolvePath(scriptDirectory, "..");
const output = resolvePath(projectRoot, "public/assets/og/home-theme-collage.jpg");

// The four themes deliberately follow the color rhythm of the approved direction:
// violet, amber, cyan, then black. The angled edges overlap slightly so resizing
// cannot reveal hairline seams between panels.
const panels: readonly Panel[] = [
  {
    brightness: 76,
    gravity: "center",
    polygon: "0,0 388,0 306,630 0,630",
    themeId: "tokyo-night",
  },
  {
    brightness: 82,
    gravity: "center",
    polygon: "378,0 704,0 622,630 296,630",
    themeId: "matte-black",
  },
  {
    brightness: 72,
    gravity: "center",
    polygon: "694,0 984,0 902,630 612,630",
    themeId: "hackerman",
  },
  {
    brightness: 92,
    gravity: "center",
    polygon: "974,0 1200,0 1200,630 892,630",
    themeId: "vantablack",
  },
] as const;

async function run(arguments_: string[]) {
  await new Promise<void>((resolve, reject) => {
    const child = spawn("magick", arguments_, { stdio: "inherit" });

    child.once("error", reject);
    child.once("exit", (exitCode) => {
      if (exitCode === 0) {
        resolve();
        return;
      }

      reject(new Error(`ImageMagick exited with code ${exitCode}: magick ${arguments_.join(" ")}`));
    });
  });
}

function getWallpaperPath(themeId: OmarchyThemeId) {
  const registered = omarchyThemes.some((theme) => theme.id === themeId);
  if (!registered) throw new Error(`Unknown Omarchy theme: ${themeId}`);

  return resolvePath(projectRoot, "public", getOfficialThemeWallpaper(themeId).replace(/^\//u, ""));
}

async function renderPanel(panel: Panel, panelOutput: string) {
  const wallpaper = getWallpaperPath(panel.themeId);
  await access(wallpaper);

  await run([
    wallpaper,
    "-auto-orient",
    "-resize",
    "1200x630^",
    "-gravity",
    panel.gravity,
    "-extent",
    "1200x630",
    "-modulate",
    `${panel.brightness},96,100`,
    "(",
    "-size",
    "1200x630",
    "xc:black",
    "-fill",
    "white",
    "-draw",
    `polygon ${panel.polygon}`,
    ")",
    "-alpha",
    "off",
    "-compose",
    "CopyOpacity",
    "-composite",
    panelOutput,
  ]);
}

async function generateCollage() {
  const temporaryDirectory = await mkdtemp(join(tmpdir(), "omarchy-home-og-"));

  try {
    const panelOutputs = panels.map((_, index) => join(temporaryDirectory, `panel-${index}.png`));
    await Promise.all(panels.map((panel, index) => renderPanel(panel, panelOutputs[index])));
    const temporaryOutput = join(temporaryDirectory, "home-theme-collage.jpg");

    const compositeArguments = ["-size", "1200x630", "xc:#08090d"];
    for (const panelOutput of panelOutputs) {
      compositeArguments.push(panelOutput, "-compose", "Over", "-composite");
    }

    compositeArguments.push(
      "-fill",
      "rgba(5,6,10,0.18)",
      "-draw",
      "rectangle 0,0 1200,630",
      "-strip",
      "-sampling-factor",
      "4:2:0",
      "-interlace",
      "Plane",
      "-quality",
      "88",
      temporaryOutput
    );

    await run(compositeArguments);
    const status = await writeFileIfChanged(output, await readFile(temporaryOutput));
    console.log(`${status === "written" ? "Generated" : "Unchanged"} ${output}`);
  } finally {
    await rm(temporaryDirectory, { force: true, recursive: true });
  }
}

if (!process.argv.includes("--force") && (await fileExists(output))) {
  console.log(`Skipped existing ${output}`);
} else {
  await generateCollage();
}
