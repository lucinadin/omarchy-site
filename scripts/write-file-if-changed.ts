import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export async function fileExists(filename: string) {
  try {
    return (await stat(filename)).isFile();
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return false;
    throw error;
  }
}

export async function writeFileIfChanged(
  filename: string,
  contents: Uint8Array
): Promise<"unchanged" | "written"> {
  const nextContents = Buffer.from(contents);

  try {
    const currentContents = await readFile(filename);
    if (currentContents.equals(nextContents)) return "unchanged";
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
  }

  await mkdir(dirname(filename), { recursive: true });
  await writeFile(filename, nextContents);
  return "written";
}

export async function writeOrCheckFile(filename: string, contents: Uint8Array, check: boolean) {
  if (!check) return writeFileIfChanged(filename, contents);
  try {
    const currentContents = await readFile(filename);
    return currentContents.equals(Buffer.from(contents)) ? "unchanged" : "changed";
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return "missing";
    throw error;
  }
}
