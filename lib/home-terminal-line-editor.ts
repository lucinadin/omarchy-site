import { unreachable } from "@/lib/validation";

export type TerminalCompletionPath = readonly string[];

export type TerminalSubmitResult = {
  action?: "clear" | "close";
  completionPaths?: readonly TerminalCompletionPath[];
  output?: readonly string[];
};

export type TerminalSurface = {
  cols: number;
  write: (data: string) => void;
};

type TerminalLineEditorCallbacks = {
  onClear?: () => void;
  onInterrupt?: () => void;
  onSubmit?: (command: string) => TerminalSubmitResult;
};

type TerminalLineEditorOptions = {
  completionPaths: readonly TerminalCompletionPath[];
  initialLine?: string;
  maxInputLength?: number;
  prompt: string;
  promptWidth: number;
  welcome?: readonly string[];
};

type CompletionContext = {
  completedTokens: string[];
  prefix: string;
};

const bell = "\u0007";
const esc = "\u001B[";
const clearDisplay = `${esc}3J${esc}2J${esc}H`;
const dim = `${esc}2m`;
const reset = `${esc}0m`;
const defaultMaxInputLength = 240;
const maxHistoryEntries = 50;

type CodePointRange = readonly [minimum: number, maximum: number];

type TerminalControlInput =
  | "previous-history"
  | "next-history"
  | "cursor-left"
  | "cursor-right"
  | "line-start"
  | "line-end"
  | "delete-forward"
  | "interrupt"
  | "clear"
  | "delete-to-start"
  | "delete-to-end"
  | "delete-word"
  | "complete";

const terminalControlInputs = new Map<string, TerminalControlInput>([
  ["\u001B[A", "previous-history"],
  ["\u001BOA", "previous-history"],
  ["\u001B[B", "next-history"],
  ["\u001BOB", "next-history"],
  ["\u001B[D", "cursor-left"],
  ["\u001BOD", "cursor-left"],
  ["\u001B[C", "cursor-right"],
  ["\u001BOC", "cursor-right"],
  ["\u001B[H", "line-start"],
  ["\u001BOH", "line-start"],
  ["\u0001", "line-start"],
  ["\u001B[F", "line-end"],
  ["\u001BOF", "line-end"],
  ["\u0005", "line-end"],
  ["\u001B[3~", "delete-forward"],
  ["\u0004", "delete-forward"],
  ["\u0003", "interrupt"],
  ["\u000C", "clear"],
  ["\u0015", "delete-to-start"],
  ["\u000B", "delete-to-end"],
  ["\u0017", "delete-word"],
  ["\t", "complete"],
]);

const zeroWidthRanges: readonly CodePointRange[] = [
  [0x0300, 0x036f],
  [0x1ab0, 0x1aff],
  [0x1dc0, 0x1dff],
  [0xfe00, 0xfe0f],
  [0xfe20, 0xfe2f],
];
const wideRanges: readonly CodePointRange[] = [
  [0x1100, 0x115f],
  [0x2e80, 0x303e],
  [0x3040, 0xa4cf],
  [0xac00, 0xd7a3],
  [0xf900, 0xfaff],
  [0xfe10, 0xfe19],
  [0xfe30, 0xfe6f],
  [0xff00, 0xff60],
  [0xffe0, 0xffe6],
  [0x1f300, 0x1faff],
  [0x20000, 0x3fffd],
];

function inCodePointRanges(codePoint: number, ranges: readonly CodePointRange[]) {
  return ranges.some(([minimum, maximum]) => codePoint >= minimum && codePoint <= maximum);
}

function codePointWidth(character: string) {
  const codePoint = character.codePointAt(0) ?? 0;

  if (codePoint === 0x200d || inCodePointRanges(codePoint, zeroWidthRanges)) {
    return 0;
  }

  if (codePoint === 0x2329 || codePoint === 0x232a || inCodePointRanges(codePoint, wideRanges)) {
    return 2;
  }

  return 1;
}

function textWidth(characters: readonly string[], end = characters.length) {
  let width = 0;
  for (let index = 0; index < end; index += 1) width += codePointWidth(characters[index]);
  return width;
}

function completionContext(source: string): CompletionContext {
  const completedTokens: string[] = [];
  let current = "";
  let quote: "'" | '"' | null = null;

  for (const character of source) {
    if (quote) {
      current += character;
      if (character === quote) quote = null;
      continue;
    }

    if (character === '"' || character === "'") {
      quote = character;
      current += character;
      continue;
    }

    if (/\s/u.test(character)) {
      if (current) {
        completedTokens.push(current);
        current = "";
      }
      continue;
    }

    current += character;
  }

  return { completedTokens, prefix: current };
}

function longestCommonPrefix(values: readonly string[]) {
  if (values.length === 0) return "";
  let prefix = values[0];

  for (let index = 1; index < values.length; index += 1) {
    while (!values[index].startsWith(prefix)) prefix = prefix.slice(0, -1);
    if (!prefix) break;
  }

  return prefix;
}

function sameTokenPrefix(path: TerminalCompletionPath, tokens: readonly string[]) {
  if (path.length <= tokens.length) return false;
  return tokens.every((token, index) => path[index] === token);
}

export class TerminalLineEditor {
  private readonly baseCompletionPaths: readonly TerminalCompletionPath[];
  private callbacks: TerminalLineEditorCallbacks = {};
  private closed = false;
  private completionPaths: readonly TerminalCompletionPath[];
  private cursor: number;
  private history: string[] = [];
  private historyDraft = "";
  private historyIndex = 0;
  private line: string[];
  private readonly maxInputLength: number;
  private readonly prompt: string;
  private readonly promptWidth: number;
  private started = false;
  private surface: TerminalSurface | null = null;
  private transcript = "";
  private readonly welcome: readonly string[];

  constructor(options: TerminalLineEditorOptions) {
    this.baseCompletionPaths = options.completionPaths;
    this.completionPaths = options.completionPaths;
    this.line = Array.from(options.initialLine ?? "");
    this.cursor = this.line.length;
    this.historyIndex = this.history.length;
    this.maxInputLength = options.maxInputLength ?? defaultMaxInputLength;
    this.prompt = options.prompt;
    this.promptWidth = options.promptWidth;
    this.welcome = options.welcome ?? [];
  }

  get input() {
    return this.line.join("");
  }

  get inputCursor() {
    return this.cursor;
  }

  attach(surface: TerminalSurface) {
    this.surface = surface;
    if (this.started) {
      surface.write(this.transcript);
      return;
    }

    this.started = true;
    if (this.welcome.length > 0) {
      this.emit(`${this.welcome.join("\r\n")}\r\n`);
    }
    this.emit(`${this.prompt}${this.input}`);
  }

  configure(callbacks: TerminalLineEditorCallbacks) {
    this.callbacks = callbacks;
  }

  detach(surface: TerminalSurface) {
    if (this.surface === surface) this.surface = null;
  }

  handleInput(data: string) {
    if (!data || this.closed) return;
    if (this.handleControlInput(data)) return;
    if (data.startsWith("\u001B[200~") && data.endsWith("\u001B[201~")) {
      this.handleText(data.slice(6, -6));
      return;
    }
    if (data.includes("\u001B")) return;

    this.handleText(data);
  }

  private handleControlInput(data: string) {
    const action = terminalControlInputs.get(data);
    if (!action) return false;

    switch (action) {
      case "previous-history":
        this.previousHistory();
        break;
      case "next-history":
        this.nextHistory();
        break;
      case "cursor-left":
        this.moveCursor(-1);
        break;
      case "cursor-right":
        this.moveCursor(1);
        break;
      case "line-start":
        this.moveTo(0);
        break;
      case "line-end":
        this.moveTo(this.line.length);
        break;
      case "delete-forward":
        this.deleteForward();
        break;
      case "interrupt":
        this.interrupt();
        break;
      case "clear":
        this.completionPaths = this.baseCompletionPaths;
        this.clear(true);
        this.callbacks.onClear?.();
        break;
      case "delete-to-start":
        this.deleteToStart();
        break;
      case "delete-to-end":
        this.deleteToEnd();
        break;
      case "delete-word":
        this.deleteWord();
        break;
      case "complete":
        this.complete();
        break;
      default:
        return unreachable(action);
    }

    return true;
  }

  private emit(data: string, record = true) {
    if (record) this.transcript += data;
    this.surface?.write(data);
  }

  private handleText(data: string) {
    const normalized = data.replaceAll("\r\n", "\n").replaceAll("\r", "\n");
    let printable = "";

    const flushPrintable = () => {
      if (!printable) return;
      this.insert(printable);
      printable = "";
    };

    for (const character of normalized) {
      if (character === "\n") {
        flushPrintable();
        if (!this.submit()) return;
        continue;
      }
      if (character === "\u007F" || character === "\b") {
        flushPrintable();
        this.backspace();
        continue;
      }

      const codePoint = character.codePointAt(0) ?? 0;
      if (codePoint >= 0x20 && !(codePoint >= 0x7f && codePoint <= 0x9f)) {
        printable += character;
      }
    }

    flushPrintable();
  }

  private insert(value: string) {
    const available = this.maxInputLength - this.line.length;
    if (available <= 0) {
      this.emit(bell, false);
      return;
    }

    const inserted = Array.from(value).slice(0, available);
    if (inserted.length === 0) return;
    const previousLine = this.line;
    const previousCursor = this.cursor;
    const atEnd = this.cursor === this.line.length;
    this.line = [...this.line.slice(0, this.cursor), ...inserted, ...this.line.slice(this.cursor)];
    this.cursor += inserted.length;
    this.resetHistoryNavigation();

    if (atEnd) {
      this.emit(inserted.join(""));
    } else {
      this.redraw(previousLine, previousCursor);
    }

    if (inserted.length < Array.from(value).length) this.emit(bell, false);
  }

  private backspace() {
    if (this.cursor === 0) {
      this.emit(bell, false);
      return;
    }

    const previousLine = this.line;
    const previousCursor = this.cursor;
    const removed = this.line[this.cursor - 1];
    const atEnd = this.cursor === this.line.length;
    this.line = [...this.line.slice(0, this.cursor - 1), ...this.line.slice(this.cursor)];
    this.cursor -= 1;
    this.resetHistoryNavigation();

    const cols = this.columns;
    const previousOffset = this.promptWidth + textWidth(previousLine, previousCursor);
    const nextOffset = this.promptWidth + textWidth(this.line, this.cursor);
    const sameRow = Math.floor(previousOffset / cols) === Math.floor(nextOffset / cols);

    if (atEnd && codePointWidth(removed) === 1 && sameRow) {
      this.emit("\b \b");
    } else {
      this.redraw(previousLine, previousCursor);
    }
  }

  private deleteForward() {
    if (this.cursor >= this.line.length) {
      this.emit(bell, false);
      return;
    }

    const previousLine = this.line;
    const previousCursor = this.cursor;
    this.line = [...this.line.slice(0, this.cursor), ...this.line.slice(this.cursor + 1)];
    this.resetHistoryNavigation();
    this.redraw(previousLine, previousCursor);
  }

  private deleteToStart() {
    if (this.cursor === 0) return;
    const previousLine = this.line;
    const previousCursor = this.cursor;
    this.line = this.line.slice(this.cursor);
    this.cursor = 0;
    this.resetHistoryNavigation();
    this.redraw(previousLine, previousCursor);
  }

  private deleteToEnd() {
    if (this.cursor >= this.line.length) return;
    this.line = this.line.slice(0, this.cursor);
    this.resetHistoryNavigation();
    this.emit(`${esc}J`);
  }

  private deleteWord() {
    if (this.cursor === 0) return;
    const previousLine = this.line;
    const previousCursor = this.cursor;
    let start = this.cursor;
    while (start > 0 && /\s/u.test(this.line[start - 1])) start -= 1;
    while (start > 0 && !/\s/u.test(this.line[start - 1])) start -= 1;
    this.line = [...this.line.slice(0, start), ...this.line.slice(this.cursor)];
    this.cursor = start;
    this.resetHistoryNavigation();
    this.redraw(previousLine, previousCursor);
  }

  private moveCursor(direction: -1 | 1) {
    const next = Math.max(0, Math.min(this.line.length, this.cursor + direction));
    if (next === this.cursor) {
      this.emit(bell, false);
      return;
    }

    const previousCursor = this.cursor;
    const previousOffset = this.promptWidth + textWidth(this.line, previousCursor);
    const nextOffset = this.promptWidth + textWidth(this.line, next);
    this.cursor = next;

    if (Math.floor(previousOffset / this.columns) === Math.floor(nextOffset / this.columns)) {
      const distance = Math.abs(nextOffset - previousOffset);
      this.emit(`${esc}${distance}${direction < 0 ? "D" : "C"}`);
      return;
    }

    this.redraw(this.line, previousCursor);
  }

  private moveTo(next: number) {
    const target = Math.max(0, Math.min(this.line.length, next));
    if (target === this.cursor) return;
    const previousCursor = this.cursor;
    this.cursor = target;
    this.redraw(this.line, previousCursor);
  }

  private previousHistory() {
    if (this.history.length === 0 || this.historyIndex === 0) {
      this.emit(bell, false);
      return;
    }

    if (this.historyIndex === this.history.length) this.historyDraft = this.input;
    const previousLine = this.line;
    const previousCursor = this.cursor;
    this.historyIndex -= 1;
    this.line = Array.from(this.history[this.historyIndex]);
    this.cursor = this.line.length;
    this.redraw(previousLine, previousCursor);
  }

  private nextHistory() {
    if (this.history.length === 0 || this.historyIndex >= this.history.length) {
      this.emit(bell, false);
      return;
    }

    const previousLine = this.line;
    const previousCursor = this.cursor;
    this.historyIndex += 1;
    this.line = Array.from(
      this.historyIndex === this.history.length
        ? this.historyDraft
        : this.history[this.historyIndex]
    );
    this.cursor = this.line.length;
    this.redraw(previousLine, previousCursor);
  }

  private resetHistoryNavigation() {
    this.historyIndex = this.history.length;
    this.historyDraft = "";
  }

  private complete() {
    const context = completionContext(this.line.slice(0, this.cursor).join(""));
    const tokenIndex = context.completedTokens.length;
    const matchingPaths = this.completionPaths.filter(
      (path) =>
        sameTokenPrefix(path, context.completedTokens) &&
        path[tokenIndex].startsWith(context.prefix)
    );
    const candidates = [...new Set(matchingPaths.map((path) => path[tokenIndex]))].toSorted();

    if (candidates.length === 0) {
      this.emit(bell, false);
      return;
    }

    if (candidates.length === 1) {
      const candidate = candidates[0];
      const remainder = candidate.slice(context.prefix.length);
      const hasFollowingToken = matchingPaths.some((path) => path.length > tokenIndex + 1);
      this.insert(`${remainder}${hasFollowingToken ? " " : ""}`);
      return;
    }

    const commonPrefix = longestCommonPrefix(candidates);
    if (commonPrefix.length > context.prefix.length) {
      this.insert(commonPrefix.slice(context.prefix.length));
      return;
    }

    this.showCompletions(candidates);
  }

  private showCompletions(candidates: readonly string[]) {
    const cursor = this.cursor;
    this.movePhysicalCursorToEnd();
    this.emit(`\r\n${dim}${candidates.join("  ")}${reset}\r\n${this.prompt}${this.input}`);
    this.positionCursorFromEnd(cursor);
  }

  private submit() {
    const command = this.input;
    this.emit("\r\n");

    if (command.trim()) {
      this.history.push(command);
      if (this.history.length > maxHistoryEntries) this.history.shift();
    }

    this.line = [];
    this.cursor = 0;
    this.resetHistoryNavigation();

    const result = this.callbacks.onSubmit?.(command) ?? {};
    if (result.completionPaths) this.completionPaths = result.completionPaths;
    if (result.action === "close") {
      this.closed = true;
      return false;
    }
    if (result.action === "clear") {
      this.clear(false);
      return true;
    }

    if (result.output && result.output.length > 0) {
      this.emit(`${result.output.map((line) => `${dim}${line}${reset}`).join("\r\n")}\r\n`);
    }
    this.emit(this.prompt);
    return true;
  }

  private interrupt() {
    this.movePhysicalCursorToEnd();
    this.emit("^C\r\n");
    this.line = [];
    this.cursor = 0;
    this.resetHistoryNavigation();
    this.completionPaths = this.baseCompletionPaths;
    this.callbacks.onInterrupt?.();
    this.emit(this.prompt);
  }

  private clear(preserveInput: boolean) {
    if (!preserveInput) {
      this.line = [];
      this.cursor = 0;
      this.resetHistoryNavigation();
    }

    this.surface?.write(clearDisplay);
    this.transcript = "";
    this.emit(`${this.prompt}${this.input}`);
    this.positionCursorFromEnd(this.cursor);
  }

  private redraw(previousLine: readonly string[], previousCursor: number) {
    const columns = this.columns;
    const previousOffset = this.promptWidth + textWidth(previousLine, previousCursor);
    const previousRow = Math.floor(previousOffset / columns);
    const moveToStart = `\r${previousRow > 0 ? `${esc}${previousRow}A` : ""}`;
    this.emit(`${moveToStart}${esc}J${this.prompt}${this.input}`);
    this.positionCursorFromEnd(this.cursor);
  }

  private movePhysicalCursorToEnd() {
    const columns = this.columns;
    const currentOffset = this.promptWidth + textWidth(this.line, this.cursor);
    const endOffset = this.promptWidth + textWidth(this.line);
    const rowDelta = Math.floor(endOffset / columns) - Math.floor(currentOffset / columns);
    const endColumn = endOffset % columns;
    if (rowDelta === 0 && endColumn === currentOffset % columns) return;
    this.emit(
      `\r${rowDelta > 0 ? `${esc}${rowDelta}B` : ""}${endColumn > 0 ? `${esc}${endColumn}C` : ""}`
    );
  }

  private positionCursorFromEnd(cursor: number) {
    const columns = this.columns;
    const endOffset = this.promptWidth + textWidth(this.line);
    const targetOffset = this.promptWidth + textWidth(this.line, cursor);
    const rowDelta = Math.floor(endOffset / columns) - Math.floor(targetOffset / columns);
    const targetColumn = targetOffset % columns;
    if (rowDelta === 0 && targetColumn === endOffset % columns) return;
    this.emit(
      `\r${rowDelta > 0 ? `${esc}${rowDelta}A` : ""}${targetColumn > 0 ? `${esc}${targetColumn}C` : ""}`
    );
  }

  private get columns() {
    return Math.max(1, this.surface?.cols ?? 80);
  }
}
