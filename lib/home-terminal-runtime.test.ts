import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  type DesktopCommandRuntime,
  type DesktopCommandState,
  emptyTerminalSession,
  runTerminalCommand,
} from "@/lib/home-terminal-runtime";

const initialState: DesktopCommandState = {
  barPosition: "top",
  barTransparent: false,
  barVisible: true,
  clockFormat: "ddd dd MMM HH:mm",
  cursorBlink: false,
  cursorStyle: "block",
  mediaPluginEnabled: false,
  themeId: "tokyo-night",
};

type RuntimeEvents = {
  downloads: number;
  external: string[];
  navigation: string[];
  states: DesktopCommandState[];
};

function createRuntime() {
  const events: RuntimeEvents = {
    downloads: 0,
    external: [],
    navigation: [],
    states: [],
  };
  const runtime: DesktopCommandRuntime = {
    applyDesktopState: (state) => events.states.push(state),
    changeDesktop: (patch) => {
      runtime.state = { ...runtime.state, ...patch };
      events.states.push(runtime.state);
      return true;
    },
    desktopHistoryRef: { current: [] },
    downloadIso: () => {
      events.downloads += 1;
    },
    openExternal: (href) => events.external.push(href),
    routerPush: (href) => events.navigation.push(href),
    showNotification: () => {},
    state: initialState,
  };

  return { events, runtime };
}

describe("browser terminal runtime", () => {
  test("uses choice then confirmation for an application destination", () => {
    const { events, runtime } = createRuntime();
    const application = runTerminalCommand("obsidian", emptyTerminalSession(), runtime);

    assert.match(application.output[0], /This browser cannot launch it/u);
    assert.equal(application.session.pendingPrompt?.kind, "application-choice");

    const choice = runTerminalCommand("m", application.session, runtime);
    assert.ok(choice.output.includes("Open Obsidian's Omarchy manual entry? [y/n]"));
    assert.deepEqual(events.navigation, []);

    const confirmation = runTerminalCommand("y", choice.session, runtime);
    assert.deepEqual(events.navigation, ["/manual/guis/#obsidian"]);
    assert.equal(confirmation.session.pendingPrompt, null);
  });

  test("offers short agent examples instead of requiring a full prompt", () => {
    const { runtime } = createRuntime();
    const picker = runTerminalCommand("omarchy agent prompt", emptyTerminalSession(), runtime);

    assert.ok(picker.output.includes("Run one? [1/2/n]"));
    assert.ok(picker.completionPaths.some((path) => path.length === 1 && path[0] === "1"));

    const result = runTerminalCommand("1", picker.session, runtime);
    assert.ok(result.output.some((line) => line.startsWith("Cloned omarchy.clock")));
    assert.equal(runtime.state.clockFormat, "dddd HH:mm:ss");
  });

  test("executes discovery options advertised by help", () => {
    const { runtime } = createRuntime();
    const json = runTerminalCommand("omarchy commands --json", emptyTerminalSession(), runtime);
    const check = runTerminalCommand("omarchy commands --check", emptyTerminalSession(), runtime);

    assert.equal(JSON.parse(json.output.join("\n")).ok, true);
    assert.match(check.output[0], /^Command metadata check passed/u);
  });
});
