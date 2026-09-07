import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  parseOmarchyCommand,
  renderOmarchyCommandHelp,
  resolveOmarchyHelp,
  tokenizeTerminalCommand,
} from "@/lib/home-terminal-commands";

describe("Omarchy command discovery", () => {
  test("tokenizes quoted arguments without losing their spaces", () => {
    assert.deepEqual(tokenizeTerminalCommand('omarchy theme set "Tokyo Night"'), [
      "omarchy",
      "theme",
      "set",
      "Tokyo Night",
    ]);
  });

  test("resolves the longest command route", () => {
    const parsed = parseOmarchyCommand('omarchy bar set omarchy.clock format "HH:mm:ss"');

    assert.equal(parsed?.definition?.id, "bar-set-clock-format");
    assert.deepEqual(parsed?.args, ["omarchy.clock", "format", "HH:mm:ss"]);
  });

  test("supports root, group, and command-level help", () => {
    const root = parseOmarchyCommand("omarchy --help");
    const group = parseOmarchyCommand("omarchy theme --help");
    const command = parseOmarchyCommand("omarchy commands --help");

    assert.ok(root);
    assert.ok(group);
    assert.ok(command?.definition);
    assert.ok(resolveOmarchyHelp(root)?.includes("Omarchy command center"));
    const groupHelp = resolveOmarchyHelp(group)?.join("\n") ?? "";
    assert.match(groupHelp, /omarchy theme current\s+Print the current theme/u);
    assert.match(groupHelp, /omarchy theme list\s+List available themes/u);
    assert.match(groupHelp, /omarchy theme set <theme-name>\s+Apply an Omarchy theme/u);
    assert.ok(renderOmarchyCommandHelp(command.definition).includes("Options:"));
  });

  test("treats a missing argument as part of the selected command", () => {
    const parsed = parseOmarchyCommand("omarchy agent prompt");

    assert.equal(parsed?.definition?.id, "agent-prompt");
    assert.deepEqual(parsed?.args, []);
  });
});
