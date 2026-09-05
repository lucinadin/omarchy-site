import {
  findTerminalApplication,
  omarchyApplications,
  type OmarchyApplication,
} from "@/content/omarchy-applications";
import { OMARCHY_MARK } from "@/lib/effects/logo/mark";
import { defaultDesktopClockFormat, isDesktopClockFormat } from "@/lib/home-desktop-clock";
import { parseBarPosition, type BarPosition } from "@/lib/home-desktop-layout";
import {
  agentExampleCompletionPaths,
  agentExamples,
  applicationChoiceCompletionPaths,
  omarchyCommandDefinitions,
  parseOmarchyCommand,
  renderOmarchyCommandHelp,
  renderOmarchyCommands,
  renderOmarchyRootHelp,
  resolveOmarchyHelp,
  terminalCompletionPaths,
  type OmarchyCommandDefinition,
  yesNoCompletionPaths,
} from "@/lib/home-terminal-commands";
import type { TerminalCompletionPath } from "@/lib/home-terminal-line-editor";
import { heyUrl } from "@/lib/site-links";
import { defaultThemeId, omarchyThemes } from "@/lib/themes/official";
import { unreachable } from "@/lib/validation";

export type CursorStyle = "beam" | "block" | "underline";

type ApplicationDestination = "manual" | "website";

type TerminalPendingPrompt =
  | { kind: "agent-example" }
  | { applicationId: string; kind: "application-choice" }
  | {
      applicationId: string;
      destination: ApplicationDestination;
      kind: "application-confirm";
    }
  | { kind: "download" }
  | { kind: "freedom" }
  | { href: string; kind: "navigation"; label: string }
  | { kind: "sudo-install" }
  | null;

export type TerminalSession = {
  pendingPrompt: TerminalPendingPrompt;
  unknownCommandCount: number;
};

export type DesktopCommandState = {
  barPosition: BarPosition;
  barTransparent: boolean;
  barVisible: boolean;
  clockFormat: string;
  cursorBlink: boolean;
  cursorStyle: CursorStyle;
  mediaPluginEnabled: boolean;
  themeId: string;
};

export type DesktopCommandRuntime = {
  applyDesktopState: (state: DesktopCommandState) => void;
  changeDesktop: (patch: Partial<DesktopCommandState>, notificationMessage: string) => boolean;
  desktopHistoryRef: { current: DesktopCommandState[] };
  downloadIso: () => void;
  openExternal: (href: string) => void;
  routerPush: (href: string) => void;
  showNotification: (message: string) => void;
  state: DesktopCommandState;
};

type TerminalCommandResponse = {
  completionPaths: readonly TerminalCompletionPath[];
  output: string[];
  session: TerminalSession;
};

type CommandResult = {
  output: string[];
  prompt?: NonNullable<TerminalPendingPrompt>;
};

const esc = "\u001B[";
const reset = `${esc}0m`;
const cyan = `${esc}36m`;
const red = `${esc}31m`;
const clockAgentPrompt = "Clone the clock plugin and show seconds";
const cursorAgentPrompt = "Make my terminal cursor a blinking bar";

const asciiGlyphs = {
  A: ".#./#.#/###/#.#/#.#",
  B: "##./#.#/##./#.#/##.",
  C: ".##/#../#../#../.##",
  D: "##./#.#/#.#/#.#/##.",
  E: "###/#../##./#../###",
  F: "###/#../##./#../#..",
  G: ".##/#../#.#/#.#/.##",
  H: "#.#/#.#/###/#.#/#.#",
  I: "###/.#./.#./.#./###",
  J: "..#/..#/..#/#.#/.#.",
  K: "#.#/#.#/##./#.#/#.#",
  L: "#../#../#../#../###",
  M: "#.#/###/###/#.#/#.#",
  N: "#.#/###/###/###/#.#",
  O: ".#./#.#/#.#/#.#/.#.",
  P: "##./#.#/##./#../#..",
  Q: ".#./#.#/#.#/.##/..#",
  R: "##./#.#/##./#.#/#.#",
  S: ".##/#../.#./..#/##.",
  T: "###/.#./.#./.#./.#.",
  U: "#.#/#.#/#.#/#.#/.##",
  V: "#.#/#.#/#.#/#.#/.#.",
  W: "#.#/#.#/###/###/#.#",
  X: "#.#/#.#/.#./#.#/#.#",
  Y: "#.#/#.#/.#./.#./.#.",
  Z: "###/..#/.#./#../###",
} as const satisfies Readonly<Record<string, string>>;

type AsciiGlyph = keyof typeof asciiGlyphs;

function isAsciiGlyph(value: string): value is AsciiGlyph {
  return value in asciiGlyphs;
}

function asciiArt(input: string) {
  const characters = Array.from(input.toUpperCase())
    .filter(
      (character): character is " " | AsciiGlyph => character === " " || isAsciiGlyph(character)
    )
    .slice(0, 14);
  if (characters.every((character) => character === " ")) return [];

  return Array.from({ length: 5 }, (_, row) =>
    characters
      .map((character) => {
        if (character === " ") return "   ";
        return asciiGlyphs[character].split("/")[row].replaceAll(".", " ");
      })
      .join(" ")
      .trimEnd()
  );
}

function terminalLink(label: string, url: string) {
  const osc = "\u001B]";
  const bell = "\u0007";
  return `${osc}8;;${url}${bell}${label}${osc}8;;${bell}`;
}

export function emptyTerminalSession(): TerminalSession {
  return { pendingPrompt: null, unknownCommandCount: 0 };
}

function completionPathsForPrompt(prompt: TerminalPendingPrompt) {
  if (prompt?.kind === "application-choice") return applicationChoiceCompletionPaths;
  if (prompt?.kind === "agent-example") return agentExampleCompletionPaths;
  if (prompt) return yesNoCompletionPaths;
  return terminalCompletionPaths;
}

function applicationById(id: string) {
  return omarchyApplications.find((application) => application.id === id);
}

function applicationKindLabel(application: OmarchyApplication) {
  switch (application.kind) {
    case "native":
      return "a native Omarchy app";
    case "tui":
      return "a terminal app in Omarchy";
    case "web-app":
      return "an Omarchy web app";
    case "service":
      return "an Omarchy service";
    case "vm":
      return "an Omarchy virtual machine entry";
    default:
      return unreachable(application.kind);
  }
}

function applicationChoice(application: OmarchyApplication): CommandResult {
  const choices = application.websiteUrl
    ? "Open: [m]anual  [w]ebsite  [n]either"
    : "Open: [m]anual  [n]either";
  return {
    output: [
      `${application.name} is ${applicationKindLabel(application)}. This browser cannot launch it.`,
      "",
      choices,
    ],
    prompt: { applicationId: application.id, kind: "application-choice" },
  };
}

function agentExamplePicker(): CommandResult {
  return {
    output: [
      "Browser-safe agent examples:",
      ...agentExamples.map((example) => `  ${example.key}  ${example.label}`),
      "",
      "Run one? [1/2/n]",
    ],
    prompt: { kind: "agent-example" },
  };
}

function runAgentPrompt(prompt: string, runtime: DesktopCommandRuntime): CommandResult {
  if (prompt === clockAgentPrompt) {
    runtime.changeDesktop({ clockFormat: "dddd HH:mm:ss" }, "my.clock reloaded");
    return {
      output: [
        "Cloned omarchy.clock → my.clock",
        "Set format → dddd HH:mm:ss",
        "Plugin reloaded. The bar now updates every second.",
      ],
    };
  }

  if (prompt === cursorAgentPrompt) {
    runtime.changeDesktop({ cursorBlink: true, cursorStyle: "beam" }, "Agent changed the cursor");
    return {
      output: [
        "Updated ~/.config/ghostty/config",
        'cursor-style = "bar"',
        "cursor-style-blink = true",
        "Restarted the terminal.",
      ],
    };
  }

  return {
    output: [
      "The real command launches your configured agent with any prompt.",
      "This browser preview only runs deterministic examples.",
    ],
  };
}

function commandsCommandResult(
  args: readonly string[],
  command: OmarchyCommandDefinition
): CommandResult {
  const option = args[0];
  if (!option || option === "--all") return { output: renderOmarchyCommands() };
  if (option === "--json") {
    return {
      output: JSON.stringify(
        {
          commands: omarchyCommandDefinitions.map((definition) => ({
            args: definition.args ?? "",
            route: ["omarchy", ...definition.route].join(" "),
            summary: definition.summary,
          })),
          ok: true,
        },
        null,
        2
      ).split("\n"),
    };
  }
  if (option === "--markdown") {
    return {
      output: [
        "| Command | Summary |",
        "| --- | --- |",
        ...omarchyCommandDefinitions.map(
          (definition) => `| \`omarchy ${definition.route.join(" ")}\` | ${definition.summary} |`
        ),
      ],
    };
  }
  if (option === "--check") {
    return {
      output: [`Command metadata check passed (${omarchyCommandDefinitions.length} commands)`],
    };
  }
  return { output: renderOmarchyCommandHelp(command) };
}

function themeCommandResult(
  id: "theme-current" | "theme-list" | "theme-set",
  args: readonly string[],
  command: OmarchyCommandDefinition,
  runtime: DesktopCommandRuntime
): CommandResult {
  if (id === "theme-current") {
    const theme = omarchyThemes.find((candidate) => candidate.id === runtime.state.themeId);
    return { output: [theme?.name ?? runtime.state.themeId] };
  }
  if (id === "theme-list") {
    return {
      output: [...omarchyThemes.map((theme) => theme.name), "", "Browse the themes gallery? [y/n]"],
      prompt: { href: "/themes/", kind: "navigation", label: "themes gallery" },
    };
  }

  const requestedTheme = args.join(" ").trim();
  if (!requestedTheme) return { output: renderOmarchyCommandHelp(command) };
  const themeKey = requestedTheme.toLowerCase().replaceAll(" ", "-");
  const theme = omarchyThemes.find(
    (candidate) =>
      candidate.id === themeKey || candidate.name.toLowerCase() === requestedTheme.toLowerCase()
  );
  if (!theme)
    return { output: [`Theme '${requestedTheme}' does not exist.`, "Run: omarchy theme list"] };
  runtime.changeDesktop({ themeId: theme.id }, `Theme changed · ${theme.name}`);
  return { output: [] };
}

function barPositionCommandResult(
  args: readonly string[],
  command: OmarchyCommandDefinition,
  runtime: DesktopCommandRuntime
): CommandResult {
  const position = parseBarPosition(args[0]);
  if (position === null) return { output: renderOmarchyCommandHelp(command) };
  runtime.changeDesktop({ barPosition: position, barVisible: true }, `Bar position · ${position}`);
  return { output: [`Bar position set to ${position}`] };
}

function barTransparencyCommandResult(
  args: readonly string[],
  command: OmarchyCommandDefinition,
  runtime: DesktopCommandRuntime
): CommandResult {
  const value = args[0];
  if (value !== "true" && value !== "false" && value !== "toggle") {
    return { output: renderOmarchyCommandHelp(command) };
  }
  const transparent = value === "toggle" ? !runtime.state.barTransparent : value === "true";
  runtime.changeDesktop(
    { barTransparent: transparent },
    `Bar transparency · ${transparent ? "on" : "off"}`
  );
  return { output: [`Bar transparency set to ${transparent}`] };
}

function barDefaultsCommandResult(runtime: DesktopCommandRuntime): CommandResult {
  runtime.changeDesktop(
    {
      barPosition: "top",
      barTransparent: false,
      barVisible: true,
      clockFormat: defaultDesktopClockFormat,
      mediaPluginEnabled: false,
    },
    "Bar defaults restored"
  );
  return { output: ["Restored the default Omarchy bar"] };
}

function clockFormatCommandResult(
  args: readonly string[],
  command: OmarchyCommandDefinition,
  runtime: DesktopCommandRuntime
): CommandResult {
  const [widget, property, ...formatTokens] = args;
  const format = formatTokens.join(" ");
  if (widget !== "omarchy.clock" || property !== "format" || !isDesktopClockFormat(format)) {
    return {
      output: [
        ...renderOmarchyCommandHelp(command),
        "",
        "The preview accepts plain Qt date/time format text under 97 characters.",
      ],
    };
  }
  runtime.changeDesktop({ clockFormat: format }, `Clock format · ${format}`);
  return { output: ["Set format on omarchy.clock"] };
}

function toggleBarCommandResult(
  args: readonly string[],
  command: OmarchyCommandDefinition,
  runtime: DesktopCommandRuntime
): CommandResult {
  const mode = args[0] ?? "toggle";
  if (mode !== "toggle" && mode !== "on" && mode !== "off") {
    return { output: renderOmarchyCommandHelp(command) };
  }
  const visible = mode === "toggle" ? !runtime.state.barVisible : mode === "on";
  runtime.changeDesktop({ barVisible: visible }, `Bar · ${visible ? "visible" : "hidden"}`);
  return { output: [] };
}

function pluginCommandResult(
  id: "plugin-disable" | "plugin-enable" | "plugin-list",
  args: readonly string[],
  command: OmarchyCommandDefinition,
  runtime: DesktopCommandRuntime
): CommandResult {
  if (id === "plugin-list") {
    if (args[0] === "--json") {
      return {
        output: JSON.stringify(
          [
            { id: "omarchy.clock", kinds: ["bar"], name: "Clock", state: "enabled" },
            {
              id: "omarchy.media",
              kinds: ["bar"],
              name: "Media",
              state: runtime.state.mediaPluginEnabled ? "enabled" : "disabled",
            },
          ],
          null,
          2
        ).split("\n"),
      };
    }
    if (args.length > 0) return { output: renderOmarchyCommandHelp(command) };
    return {
      output: [
        "ID              STATE     SOURCE    KINDS   NAME",
        "omarchy.clock   enabled   built-in  bar     Clock",
        `omarchy.media   ${runtime.state.mediaPluginEnabled ? "enabled" : "disabled"}  built-in  bar     Media`,
        "",
        "Open the Shell Plugins chapter? [y/n]",
      ],
      prompt: {
        href: "/manual/shell-plugins/",
        kind: "navigation",
        label: "Shell Plugins chapter",
      },
    };
  }

  if (args[0] !== "omarchy.media") return { output: renderOmarchyCommandHelp(command) };
  const enabled = id === "plugin-enable";
  runtime.changeDesktop(
    { mediaPluginEnabled: enabled },
    `${enabled ? "Plugin enabled" : "Plugin disabled"} · omarchy.media`
  );
  return { output: [enabled ? "Enabled and moved omarchy.media" : "Disabled omarchy.media"] };
}

function agentCommandResult(
  args: readonly string[],
  command: OmarchyCommandDefinition,
  runtime: DesktopCommandRuntime
): CommandResult {
  const promptArgs = args[0] === "--inline" ? args.slice(1) : args;
  if (promptArgs.length === 0) {
    return {
      output: [...renderOmarchyCommandHelp(command), "", ...agentExamplePicker().output],
      prompt: { kind: "agent-example" },
    };
  }
  return runAgentPrompt(promptArgs.join(" "), runtime);
}

function keybindingsCommandResult(): CommandResult {
  return {
    output: [
      "SUPER + SPACE             Omarchy menu",
      "SUPER + ALT + SPACE       Apps menu",
      "SUPER + K                 Show all keybindings",
      "SUPER + RETURN            Open terminal",
      "SUPER + SHIFT + RETURN    Open browser",
      "SUPER + ARROW             Focus window",
      "SUPER + SHIFT + ARROW     Swap window",
      "SUPER + J                 Toggle window split",
      "SUPER + W / Q             Close window",
      "SUPER + 1–4               Switch workspace",
      "SUPER + SHIFT + 1–4       Move window to workspace",
      "",
      "Open the Hotkeys chapter in the manual? [y/n]",
    ],
    prompt: { href: "/manual/hotkeys/", kind: "navigation", label: "Hotkeys chapter" },
  };
}

function asciiCommandResult(
  args: readonly string[],
  command: OmarchyCommandDefinition
): CommandResult {
  const text = args.join(" ").trim();
  if (text.toLowerCase() === "omarchy") return { output: OMARCHY_MARK.split("\n") };
  const art = asciiArt(text);
  return { output: art.length > 0 ? art : renderOmarchyCommandHelp(command) };
}

function executeOmarchyCommand(
  source: string,
  runtime: DesktopCommandRuntime
): CommandResult | null {
  const parsed = parseOmarchyCommand(source);
  if (!parsed) return null;

  const help = resolveOmarchyHelp(parsed);
  if (help) return { output: help };

  const command = parsed.definition;
  if (!command) {
    return {
      output: [
        `Unknown Omarchy command: ${source.trim()}`,
        "Run 'omarchy commands' to discover available commands.",
      ],
    };
  }

  if (command.id === "commands") {
    return commandsCommandResult(parsed.args, command);
  }

  if (command.id === "theme-current") {
    return themeCommandResult(command.id, parsed.args, command, runtime);
  }

  if (command.id === "theme-list") {
    return themeCommandResult(command.id, parsed.args, command, runtime);
  }

  if (command.id === "theme-set") {
    return themeCommandResult(command.id, parsed.args, command, runtime);
  }

  if (command.id === "bar-position") {
    return barPositionCommandResult(parsed.args, command, runtime);
  }

  if (command.id === "bar-transparent") {
    return barTransparencyCommandResult(parsed.args, command, runtime);
  }

  if (command.id === "bar-defaults") {
    return barDefaultsCommandResult(runtime);
  }

  if (command.id === "bar-set-clock-format") {
    return clockFormatCommandResult(parsed.args, command, runtime);
  }

  if (command.id === "toggle-bar") {
    return toggleBarCommandResult(parsed.args, command, runtime);
  }

  if (command.id === "plugin-list") {
    return pluginCommandResult(command.id, parsed.args, command, runtime);
  }

  if (command.id === "plugin-enable") {
    return pluginCommandResult(command.id, parsed.args, command, runtime);
  }

  if (command.id === "plugin-disable") {
    return pluginCommandResult(command.id, parsed.args, command, runtime);
  }

  if (command.id === "agent-prompt") {
    return agentCommandResult(parsed.args, command, runtime);
  }

  if (command.id === "menu-keybindings") {
    return keybindingsCommandResult();
  }

  if (command.id === "ascii") {
    return asciiCommandResult(parsed.args, command);
  }

  return null;
}

function executeKnownCommand(source: string, runtime: DesktopCommandRuntime): CommandResult | null {
  const normalized = source.trim();

  if (normalized === "help") {
    return {
      output: [
        ...renderOmarchyRootHelp(),
        "",
        "Browser shell:",
        "  clear                 Clear this terminal",
        "  exit                  Close this terminal",
        "  go back               Undo the last desktop change",
        "  reset                 Restore the demo desktop",
        "  <application>         Find its manual or official website",
        "",
        "Tab completes commands · ↑/↓ recalls history",
      ],
    };
  }

  if (normalized === "go back") {
    const previous = runtime.desktopHistoryRef.current.pop();
    if (!previous) return { output: ["Nothing to undo."] };
    runtime.applyDesktopState(previous);
    runtime.showNotification("Desktop change undone");
    return { output: ["Restored the previous desktop state."] };
  }

  if (normalized === "reset") {
    runtime.changeDesktop(
      {
        barPosition: "top",
        barTransparent: false,
        barVisible: true,
        clockFormat: defaultDesktopClockFormat,
        cursorBlink: false,
        cursorStyle: "block",
        mediaPluginEnabled: false,
        themeId: defaultThemeId,
      },
      "Desktop reset"
    );
    return { output: ["Restored the demo defaults."] };
  }

  const omarchy = executeOmarchyCommand(normalized, runtime);
  if (omarchy) return omarchy;

  if (normalized === "whoami") return { output: ["the omarch"] };
  if (normalized === "pwd") return { output: ["/home/omarch"] };
  if (normalized === "42") return { output: ["Correct answer. Wrong command."] };
  if (normalized === "hey") return { output: [`${reset}${terminalLink("Hey", heyUrl)}`] };
  if (/^sudo(?:\s|$)/u.test(normalized)) {
    return {
      output: [
        "No root in here. Install Omarchy if you want consequences.",
        "",
        "Install Omarchy? [y/n]",
      ],
      prompt: { kind: "sudo-install" },
    };
  }

  const application = findTerminalApplication(normalized);
  if (application) return applicationChoice(application);
  return null;
}

type Prompt = NonNullable<TerminalPendingPrompt>;
type PromptOf<Kind extends Prompt["kind"]> = Extract<Prompt, { kind: Kind }>;

type PromptAnswer = {
  no: boolean;
  normalized: string;
  yes: boolean;
};

function agentExampleResponse(
  answer: PromptAnswer,
  prompt: PromptOf<"agent-example">,
  runtime: DesktopCommandRuntime
): CommandResult {
  if (answer.no) return { output: ["No example run."] };
  const example = agentExamples.find((candidate) => candidate.key === answer.normalized);
  if (!example) return { output: ["Choose 1, 2, or n."], prompt };
  return runAgentPrompt(example.description, runtime);
}

function applicationChoiceResponse(
  answer: PromptAnswer,
  prompt: PromptOf<"application-choice">
): CommandResult {
  const application = applicationById(prompt.applicationId);
  if (!application) return { output: ["That application is no longer in the catalog."] };
  if (answer.no) return { output: ["Staying in the shell."] };

  const destination: ApplicationDestination | null =
    answer.normalized === "m" || answer.normalized === "manual"
      ? "manual"
      : answer.normalized === "w" || answer.normalized === "website"
        ? "website"
        : null;
  if (!destination) return { output: ["Choose m, w, or n."], prompt };
  if (destination === "website" && !application.websiteUrl) {
    return {
      output: [`${application.name} has no website recorded here. Choose m or n.`],
      prompt,
    };
  }

  const target = destination === "manual" ? "Omarchy manual entry" : "official website";
  return {
    output: [`Open ${application.name}'s ${target}? [y/n]`],
    prompt: { applicationId: application.id, destination, kind: "application-confirm" },
  };
}

function applicationConfirmResponse(
  answer: PromptAnswer,
  prompt: PromptOf<"application-confirm">,
  runtime: DesktopCommandRuntime
): CommandResult {
  const application = applicationById(prompt.applicationId);
  if (!application) return { output: ["That application is no longer in the catalog."] };
  if (answer.no) return { output: ["Staying in the shell."] };
  if (!answer.yes) return { output: ["Answer y or n."], prompt };

  if (prompt.destination === "manual") {
    runtime.routerPush(application.manualHref);
    return { output: [`Opening ${application.name}'s Omarchy manual entry.`] };
  }
  if (!application.websiteUrl) return { output: ["No website is recorded for that application."] };
  runtime.openExternal(application.websiteUrl);
  return { output: [`Opening ${application.name}'s official website.`] };
}

function navigationResponse(
  answer: PromptAnswer,
  prompt: PromptOf<"navigation">,
  runtime: DesktopCommandRuntime
): CommandResult {
  if (answer.yes) {
    runtime.routerPush(prompt.href);
    return { output: [`Opening the ${prompt.label}.`] };
  }
  if (answer.no) return { output: ["Staying in the shell."] };
  return { output: ["Answer y or n."], prompt };
}

function freedomResponse(answer: PromptAnswer, prompt: PromptOf<"freedom">): CommandResult {
  if (answer.yes) {
    return {
      output: ["Good. Download the Omarchy ISO now? [y/n]"],
      prompt: { kind: "download" },
    };
  }
  if (answer.no) return { output: ["Fair. Type help when you want another look."] };
  return { output: ["Just y or n. We kept this part simple."], prompt };
}

function sudoInstallResponse(
  answer: PromptAnswer,
  prompt: PromptOf<"sudo-install">
): CommandResult {
  if (answer.yes) {
    return {
      output: ["This will download the Omarchy ISO. Continue? [y/n]"],
      prompt: { kind: "download" },
    };
  }
  if (answer.no) return { output: ["No consequences today."] };
  return { output: ["Answer y or n."], prompt };
}

function downloadResponse(
  answer: PromptAnswer,
  prompt: PromptOf<"download">,
  runtime: DesktopCommandRuntime
): CommandResult {
  if (answer.yes) {
    runtime.downloadIso();
    runtime.showNotification("Omarchy ISO download started");
    return { output: ["Download started. See you on the other side."] };
  }
  if (answer.no) return { output: ["No rush. The ISO link is not going anywhere."] };
  return { output: ["y downloads it. n takes you back."], prompt };
}

function respondToPendingPrompt(
  input: string,
  prompt: Prompt,
  runtime: DesktopCommandRuntime
): CommandResult {
  const normalized = input.trim().toLowerCase();
  const answer: PromptAnswer = {
    no: normalized === "n" || normalized === "no",
    normalized,
    yes: normalized === "y" || normalized === "yes",
  };

  switch (prompt.kind) {
    case "agent-example":
      return agentExampleResponse(answer, prompt, runtime);
    case "application-choice":
      return applicationChoiceResponse(answer, prompt);
    case "application-confirm":
      return applicationConfirmResponse(answer, prompt, runtime);
    case "navigation":
      return navigationResponse(answer, prompt, runtime);
    case "freedom":
      return freedomResponse(answer, prompt);
    case "sudo-install":
      return sudoInstallResponse(answer, prompt);
    case "download":
      return downloadResponse(answer, prompt, runtime);
    default:
      return unreachable(prompt);
  }
}

export function runTerminalCommand(
  command: string,
  session: TerminalSession,
  runtime: DesktopCommandRuntime
): TerminalCommandResponse {
  const normalized = command.trim();
  if (!normalized) {
    return {
      completionPaths: completionPathsForPrompt(session.pendingPrompt),
      output: [],
      session,
    };
  }

  const result = session.pendingPrompt
    ? respondToPendingPrompt(normalized, session.pendingPrompt, runtime)
    : executeKnownCommand(normalized, runtime);

  if (result) {
    const pendingPrompt = result.prompt ?? null;
    return {
      completionPaths: completionPathsForPrompt(pendingPrompt),
      output: result.output,
      session: { pendingPrompt, unknownCommandCount: 0 },
    };
  }

  const unknownCommandCount = session.unknownCommandCount + 1;
  if (unknownCommandCount >= 3) {
    const pendingPrompt = { kind: "freedom" } as const;
    return {
      completionPaths: yesNoCompletionPaths,
      output: [
        "Three dead ends. This is starting to feel like Windows or macOS.",
        "Want to be free? [y/n]",
      ],
      session: { pendingPrompt, unknownCommandCount },
    };
  }

  return {
    completionPaths: terminalCompletionPaths,
    output:
      unknownCommandCount === 1
        ? [`${red}Command not found.${reset}`, `${cyan}Try help or press Tab.${reset}`]
        : ["Another dead end."],
    session: { pendingPrompt: null, unknownCommandCount },
  };
}
