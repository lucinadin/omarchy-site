export const OMARCHY_MARK = `                 ▄▄▄
 ▄█████▄    ▄███████████▄    ▄███████   ▄███████   ▄███████   ▄█   █▄    ▄█   █▄
███   ███  ███   ███   ███  ███   ███  ███   ███  ███   ███  ███   ███  ███   ███
███   ███  ███   ███   ███  ███   ███  ███   █▀   ███   ███  ███   ███  ███   ███
███   ███  ███   ███   ███ ▄███▄▄▄███ ▄███▄▄▄██▀  ███       ▄███▄▄▄███▄ ███▄▄▄███
███   ███  ███   ███   ███ ▀███▀▀▀███ ▀███▀▀▀▀    ███      ▀▀███▀▀▀███  ▀▀▀▀▀▀███
███   ███  ███   ███   ███  ███   ███ ██████████  ███   █▄   ███   ███  ▄██   ███
███   ███  ███   ███   ███  ███   ███  ███   ███  ███   ███  ███   ███  ███   ███
 ▀█████▀    ▀█   ███   █▀   ███   █▀   ███   ███  ███████▀   ███   █▀    ▀█████▀
                                       ███   █▀`;

export const OMARCHY_MARK_COLUMNS = 81;
export const OMARCHY_MARK_ROWS = 10;

type OmarchyMarkHalf = "bottom" | "top";

function glyphFillsHalf(glyph: string, half: OmarchyMarkHalf) {
  switch (glyph) {
    case " ":
      return false;
    case "█":
      return true;
    case "▀":
      return half === "top";
    case "▄":
      return half === "bottom";
    default:
      throw new TypeError(`Unsupported Omarchy mark glyph: ${glyph}`);
  }
}

export function createOmarchyMarkPath(mark: string) {
  const rows = mark.split("\n").map((row) => Array.from(row));
  const commands: string[] = [];

  rows.forEach((row, rowIndex) => {
    (["top", "bottom"] as const).forEach((half, halfIndex) => {
      const y = rowIndex * 2 + halfIndex;
      let runStart = -1;

      for (let column = 0; column <= row.length; column += 1) {
        const filled = column < row.length && glyphFillsHalf(row[column], half);
        if (filled && runStart === -1) {
          runStart = column;
          continue;
        }
        if (filled || runStart === -1) continue;

        const width = column - runStart;
        commands.push(`M${runStart} ${y}h${width}v1h-${width}z`);
        runStart = -1;
      }
    });
  });

  return commands.join("");
}

export const OMARCHY_MARK_PATH = createOmarchyMarkPath(OMARCHY_MARK);
export const OMARCHY_MARK_VIEW_BOX = `0 0 ${OMARCHY_MARK_COLUMNS} ${OMARCHY_MARK_ROWS * 2}`;
