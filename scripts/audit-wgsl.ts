import { globSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { resolveShader } from "@vgpu/wgsl/runtime";

const requireDeviceValidation = process.argv.includes("--require-validation");
const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const shaderPaths = globSync("lib/**/*.wgsl", { cwd: projectRoot }).toSorted();

if (shaderPaths.length === 0) throw new Error("No project WGSL modules were found");

for (const shaderPath of shaderPaths) {
  try {
    const result = await resolveShader({
      entry: shaderPath,
      rootDir: projectRoot,
      minify: true,
      validate: requireDeviceValidation ? "require" : "off",
    });
    const errors = result.diagnostics.filter((diagnostic) => diagnostic.severity === "error");
    if (errors.length > 0) {
      throw new AggregateError(errors, "WGSL diagnostics contain errors");
    }
  } catch (cause) {
    throw new Error(`WGSL validation failed for ${shaderPath}`, { cause });
  }
}

console.log(
  `${requireDeviceValidation ? "Device-validated" : "Resolved and reflected"} ${shaderPaths.length} WGSL modules.`
);
