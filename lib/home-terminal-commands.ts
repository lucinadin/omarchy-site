import { omarchyApplications } from "@/content/omarchy-applications";
import { desktopClockFormats } from "@/lib/home-desktop-clock";
import type { TerminalCompletionPath } from "@/lib/home-terminal-line-editor";
import { omarchyThemes } from "@/lib/themes/official";

type OmarchyCommandId =
  | "agent-prompt"
  | "ascii"
  | "bar-defaults"
  | "bar-position"
  | "bar-set-clock-format"
  | "bar-transparent"
  | "commands"
  | "menu-keybindings"
  | "plugin-disable"
  | "plugin-enable"
  | "plugin-list"
  | "theme-current"
  | "theme-list"
  | "theme-set"
  | "toggle-bar";

export type OmarchyCommandDefinition = {
  args?: string;
  examples?: readonly string[];
  options?: readonly (readonly [string, string])[];
  id: OmarchyCommandId;
  route: readonly string[];
  summary: string;
};

type OmarchyCommandGroup = {
  description: string;
  id: string;
  label: string;
};

type ParsedTerminalCommand = {
  args: string[];
  definition: OmarchyCommandDefinition | null;
  helpRequested: boolean;
  tokens: string[];
};

const omarchyCommandGroups = [
  { description: "Coding agents", id: "agent", label: "Agent" },
  { description: "Text rendering", id: "ascii", label: "ascii" },
  { description: "Bar layout and widgets", id: "bar", label: "Bar" },
  { description: "Command discovery", id: "commands", label: "Commands" },
  { description: "Omarchy menu", id: "menu", label: "Menu" },
  { description: "Shell plugins", id: "plugin", label: "Plugin" },
  { description: "Themes", id: "theme", label: "Theme" },
  { description: "Desktop toggles", id: "toggle", label: "Toggle" },
] as const satisfies readonly OmarchyCommandGroup[];

export const omarchyCommandDefinitions: readonly OmarchyCommandDefinition[] = [
  {
    args: "[--all] [--json] [--markdown] [--check]",
    examples: ["omarchy commands", "omarchy commands --all"],
    id: "commands",
    options: [
      ["--all", "Include commands explicitly marked hidden"],
      ["--json", "Emit machine-readable JSON"],
      ["--markdown", "Emit a Markdown command table"],
      ["--check", "Validate command metadata and route collisions"],
    ],
    route: ["commands"],
    summary: "List commands known to the Omarchy command center",
  },
  {
    id: "theme-current",
    route: ["theme", "current"],
    summary: "Print the current theme",
  },
  {
    id: "theme-list",
    route: ["theme", "list"],
    summary: "List available themes",
  },
  {
    args: "<theme-name>",
    examples: ['omarchy theme set "Tokyo Night"'],
    id: "theme-set",
    route: ["theme", "set"],
    summary: "Apply an Omarchy theme",
  },
  {
    args: "<top|bottom|left|right>",
    examples: ["omarchy bar position bottom"],
    id: "bar-position",
    route: ["bar", "position"],
    summary: "Set the bar position",
  },
  {
    args: "<true|false|toggle>",
    examples: ["omarchy bar transparent toggle"],
    id: "bar-transparent",
    route: ["bar", "transparent"],
    summary: "Set or toggle bar transparency",
  },
  {
    id: "bar-defaults",
    route: ["bar", "defaults"],
    summary: "Restore the default Omarchy bar",
  },
  {
    args: "omarchy.clock format <qt-format>",
    examples: ['omarchy bar set omarchy.clock format "ddd dd MMM hh:mm:ss AP"'],
    id: "bar-set-clock-format",
    route: ["bar", "set"],
    summary: "Set a bar widget property",
  },
  {
    args: "[toggle|on|off]",
    examples: ["omarchy toggle bar", "omarchy toggle bar off"],
    id: "toggle-bar",
    route: ["toggle", "bar"],
    summary: "Toggle the Omarchy bar",
  },
  {
    args: "[--json]",
    id: "plugin-list",
    options: [["--json", "Emit machine-readable JSON"]],
    route: ["plugin", "list"],
    summary: "List discovered shell plugins",
  },
  {
    args: "<plugin-id> [placement]",
    examples: ["omarchy plugin enable omarchy.media --section center"],
    id: "plugin-enable",
    route: ["plugin", "enable"],
    summary: "Enable a shell plugin",
  },
  {
    args: "<plugin-id>",
    examples: ["omarchy plugin disable omarchy.media"],
    id: "plugin-disable",
    route: ["plugin", "disable"],
    summary: "Disable a shell plugin",
  },
  {
    args: "[--inline] <prompt...>",
    examples: [
      'omarchy agent prompt "Clone the clock plugin and show seconds"',
      'omarchy agent prompt "Make my terminal cursor a blinking bar"',
    ],
    id: "agent-prompt",
    options: [["--inline", "Run the agent in the current terminal"]],
    route: ["agent", "prompt"],
    summary: "Launch the configured coding agent with a prompt",
  },
  {
    id: "menu-keybindings",
    route: ["menu", "keybindings"],
    summary: "Search the keybindings in your Hyprland configuration",
  },
  {
    args: "[text...]",
    examples: ["omarchy ascii hello"],
    id: "ascii",
    route: ["ascii"],
    summary: "Render text as ASCII art in the Omarchy logo font",
  },
];

export const agentExamples = [
  {
    command: 'omarchy agent prompt "Clone the clock plugin and show seconds"',
    description: "Clone the clock plugin and show seconds",
    id: "clock",
    key: "1",
    label: "Add seconds to the clock",
  },
  {
    command: 'omarchy agent prompt "Make my terminal cursor a blinking bar"',
    description: "Make my terminal cursor a blinking bar",
    id: "cursor",
    key: "2",
    label: "Use a blinking bar cursor",
  },
] as const;

const quotedThemeCompletions = omarchyThemes.map((theme) => `"${theme.name}"`);
const applicationCompletions = omarchyApplications.flatMap((application) =>
  application.aliases.filter((alias) => !alias.includes(" ")).map((alias) => [alias] as const)
);

export const terminalCompletionPaths = [
  ["help"],
  ["clear"],
  ["exit"],
  ["go", "back"],
  ["reset"],
  ["hey"],
  ["pwd"],
  ["whoami"],
  ["sudo", ""],
  ["omarchy"],
  ["omarchy", "--help"],
  ...omarchyCommandGroups.map((group) => ["omarchy", group.id, "--help"] as const),
  ...omarchyCommandDefinitions.flatMap((command) => {
    const path = ["omarchy", ...command.route] as const;
    return [path, [...path, "--help"] as const];
  }),
  ...quotedThemeCompletions.map((theme) => ["omarchy", "theme", "set", theme] as const),
  ["omarchy", "bar", "position", "top"],
  ["omarchy", "bar", "position", "bottom"],
  ["omarchy", "bar", "position", "left"],
  ["omarchy", "bar", "position", "right"],
  ["omarchy", "bar", "transparent", "true"],
  ["omarchy", "bar", "transparent", "false"],
  ["omarchy", "bar", "transparent", "toggle"],
  ...desktopClockFormats.map(
    (format) => ["omarchy", "bar", "set", "omarchy.clock", "format", `"${format}"`] as const
  ),
  ["omarchy", "toggle", "bar", "on"],
  ["omarchy", "toggle", "bar", "off"],
  ["omarchy", "plugin", "enable", "omarchy.media", "--section", "center"],
  ["omarchy", "plugin", "disable", "omarchy.media"],
  ...agentExamples.map(
    (example) => ["omarchy", "agent", "prompt", `"${example.description}"`] as const
  ),
  ["omarchy", "ascii", ""],
  ...applicationCompletions,
] as const satisfies readonly TerminalCompletionPath[];

export const yesNoCompletionPaths = [
  ["y"],
  ["n"],
] as const satisfies readonly TerminalCompletionPath[];
export const applicationChoiceCompletionPaths = [
  ["m"],
  ["w"],
  ["n"],
] as const satisfies readonly TerminalCompletionPath[];
export const agentExampleCompletionPaths = [
  ["1"],
  ["2"],
  ["n"],
] as const satisfies readonly TerminalCompletionPath[];

export function tokenizeTerminalCommand(source: string) {
  const tokens: string[] = [];
  let current = "";
  let quote: "'" | '"' | null = null;

  for (const character of source.trim()) {
    if (quote) {
      if (character === quote) quote = null;
      else current += character;
      continue;
    }

    if (character === "'" || character === '"') {
      quote = character;
      continue;
    }

    if (/\s/u.test(character)) {
      if (current) {
        tokens.push(current);
        current = "";
      }
      continue;
    }

    current += character;
  }

  if (current) tokens.push(current);
  return tokens;
}

function routeMatches(route: readonly string[], tokens: readonly string[]) {
  return route.every((token, index) => tokens[index] === token);
}

export function parseOmarchyCommand(source: string): ParsedTerminalCommand | null {
  const allTokens = tokenizeTerminalCommand(source);
  if (allTokens[0] !== "omarchy") return null;

  const tokens = allTokens.slice(1);
  const helpAt = tokens.findIndex((token) => token === "--help" || token === "-h");
  const commandTokens = helpAt !== -1 ? tokens.slice(0, helpAt) : tokens;
  const definition = omarchyCommandDefinitions
    .filter((candidate) => routeMatches(candidate.route, commandTokens))
    .toSorted((left, right) => right.route.length - left.route.length)[0];

  return {
    args: definition ? commandTokens.slice(definition.route.length) : [],
    definition: definition ?? null,
    helpRequested: helpAt !== -1,
    tokens: commandTokens,
  };
}

function alignRows(rows: readonly (readonly [string, string])[]) {
  const width = Math.max(...rows.map(([label]) => label.length));
  return rows.map(([label, description]) => `  ${label.padEnd(width)}  ${description}`);
}

export function renderOmarchyRootHelp() {
  return [
    "Omarchy command center",
    "",
    "Usage:",
    "  omarchy <command> [args...]",
    "  omarchy commands [--all] [--json] [--check]",
    "  omarchy <group> --help",
    "  omarchy <group> <command> --help",
    "",
    "Common commands:",
    "  omarchy theme list          List available themes",
    "  omarchy theme set <name>    Apply a theme",
    "  omarchy bar position <side> Set the bar position",
    "  omarchy agent prompt        Try a browser-safe agent example",
    "  omarchy menu keybindings    Show real Omarchy keybindings",
    "",
    "Groups:",
    ...alignRows(omarchyCommandGroups.map((group) => [group.id, group.description] as const)),
    "",
    "Discovery:",
    "  omarchy commands            List the commands supported here",
    "  omarchy <group> --help      Show commands in one group",
    "  omarchy <command> --help    Show usage and examples",
  ];
}

export function renderOmarchyCommands() {
  return alignRows(
    omarchyCommandDefinitions.map((command) => [
      `omarchy ${command.route.join(" ")}${command.args ? ` ${command.args}` : ""}`,
      command.summary,
    ])
  );
}

export function renderOmarchyGroupHelp(groupId: string) {
  const group = omarchyCommandGroups.find((candidate) => candidate.id === groupId);
  if (!group) return null;
  const commands = omarchyCommandDefinitions.filter((command) => command.route[0] === groupId);
  if (commands.length === 0) return null;

  return [
    `${group.label} commands — ${group.description}:`,
    "",
    ...alignRows(
      commands.map((command) => [
        `omarchy ${command.route.join(" ")}${command.args ? ` ${command.args}` : ""}`,
        command.summary,
      ])
    ),
    "",
    `Run 'omarchy ${groupId} <command> --help' for details.`,
  ];
}

export function renderOmarchyCommandHelp(command: OmarchyCommandDefinition) {
  const route = `omarchy ${command.route.join(" ")}`;
  const output = [
    "Usage:",
    `  ${route}${command.args ? ` ${command.args}` : ""}`,
    "",
    command.summary,
  ];

  if (command.args) output.push("", "Arguments:", `  ${command.args}`);
  if (command.options?.length) {
    output.push("", "Options:", ...alignRows(command.options));
  }
  if (command.examples?.length) {
    output.push("", "Examples:", ...command.examples.map((example) => `  ${example}`));
  }

  return output;
}

export function resolveOmarchyHelp(parsed: ParsedTerminalCommand) {
  if (parsed.definition && parsed.helpRequested) return renderOmarchyCommandHelp(parsed.definition);
  if (parsed.tokens.length === 0 || parsed.helpRequested) {
    if (parsed.tokens.length === 1) return renderOmarchyGroupHelp(parsed.tokens[0]);
    return renderOmarchyRootHelp();
  }
  if (!parsed.definition && parsed.tokens.length === 1) {
    return renderOmarchyGroupHelp(parsed.tokens[0]);
  }
  return null;
}
