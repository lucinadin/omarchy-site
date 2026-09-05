export const desktopClockFormats = [
  "dddd HH:mm",
  "dddd h:mm AP",
  "dddd HH:mm:ss",
  "dddd h:mm:ss AP",
  "HH:mm",
  "h:mm AP",
  "ddd d MMM HH:mm",
  "ddd d MMM h:mm AP",
  "d MMMM 'W'ww yyyy",
  "yyyy-MM-dd HH:mm",
  "ddd dd MMM hh:mm:ss AP",
  "yyyy-MM-dd HH:mm:ss",
] as const;

export const defaultDesktopClockFormat =
  "dddd HH:mm" satisfies (typeof desktopClockFormats)[number];

type ClockParts = {
  day: number;
  dayOfWeek: number;
  hour: number;
  millisecond: number;
  minute: number;
  month: number;
  second: number;
  timeZoneAbbreviation: string;
  timeZoneName: string;
  timeZoneOffset: string;
  year: number;
};

const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const shortWeekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const shortMonths = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const qtClockTokens = [
  "dddd",
  "MMMM",
  "yyyy",
  "tttt",
  "ddd",
  "MMM",
  "zzz",
  "ttt",
  "dd",
  "MM",
  "yy",
  "HH",
  "hh",
  "mm",
  "ss",
  "zz",
  "tt",
  "AP",
  "ap",
  "aP",
  "Ap",
  "d",
  "M",
  "H",
  "h",
  "m",
  "s",
  "z",
  "t",
  "A",
  "a",
] as const;

function twoDigits(value: number) {
  return String(value).padStart(2, "0");
}

function timeZoneLabel(date: Date, style: "long" | "short") {
  return (
    new Intl.DateTimeFormat(undefined, { timeZoneName: style })
      .formatToParts(date)
      .find((part) => part.type === "timeZoneName")?.value ?? ""
  );
}

function localOffset(date: Date) {
  const totalMinutes = -date.getTimezoneOffset();
  const sign = totalMinutes < 0 ? "-" : "+";
  const absoluteMinutes = Math.abs(totalMinutes);
  return `${sign}${twoDigits(Math.floor(absoluteMinutes / 60))}:${twoDigits(absoluteMinutes % 60)}`;
}

function currentClockParts(): ClockParts {
  const date = new Date();
  const temporalNow = globalThis.Temporal?.Now?.zonedDateTimeISO();
  const timeZoneOffset = temporalNow?.offset ?? localOffset(date);
  const timeZoneName = timeZoneLabel(date, "long");
  const timeZoneAbbreviation = timeZoneLabel(date, "short");

  if (temporalNow) {
    return {
      day: temporalNow.day,
      dayOfWeek: temporalNow.dayOfWeek,
      hour: temporalNow.hour,
      millisecond: temporalNow.millisecond,
      minute: temporalNow.minute,
      month: temporalNow.month,
      second: temporalNow.second,
      timeZoneAbbreviation,
      timeZoneName,
      timeZoneOffset,
      year: temporalNow.year,
    };
  }

  return {
    day: date.getDate(),
    dayOfWeek: date.getDay() === 0 ? 7 : date.getDay(),
    hour: date.getHours(),
    millisecond: date.getMilliseconds(),
    minute: date.getMinutes(),
    month: date.getMonth() + 1,
    second: date.getSeconds(),
    timeZoneAbbreviation,
    timeZoneName,
    timeZoneOffset,
    year: date.getFullYear(),
  };
}

export function isDesktopClockFormat(value: string) {
  const hasControlCharacter = Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint <= 0x1f || (codePoint >= 0x7f && codePoint <= 0x9f);
  });
  const hasMarkupDelimiter = value.includes("<") || value.includes(">");
  return value.length > 0 && value.length <= 96 && !hasControlCharacter && !hasMarkupDelimiter;
}

function walkClockFormat(
  source: string,
  onLiteral: (literal: string) => void,
  onToken: (token: (typeof qtClockTokens)[number]) => void
) {
  let index = 0;

  while (index < source.length) {
    if (source[index] === "'") {
      if (source[index + 1] === "'") {
        onLiteral("'");
        index += 2;
        continue;
      }

      const closingQuote = source.indexOf("'", index + 1);
      if (closingQuote === -1) {
        onLiteral(source.slice(index + 1));
        return;
      }

      onLiteral(source.slice(index + 1, closingQuote));
      index = closingQuote + 1;
      continue;
    }

    let token: (typeof qtClockTokens)[number] | undefined;
    for (const candidate of qtClockTokens) {
      if (!source.startsWith(candidate, index)) continue;
      token = candidate;
      break;
    }
    if (token) {
      onToken(token);
      index += token.length;
      continue;
    }

    onLiteral(source[index]);
    index += 1;
  }
}

function clockFormatHasToken(format: string, tokens: readonly string[]) {
  let found = false;
  walkClockFormat(
    format.replaceAll("ww", ""),
    () => {
      // Literal text does not affect token presence.
    },
    (token) => {
      if (tokens.includes(token)) found = true;
    }
  );
  return found;
}

export function desktopClockFormatRefreshInterval(format: string) {
  if (clockFormatHasToken(format, ["z", "zz", "zzz"])) return 50;
  if (clockFormatHasToken(format, ["s", "ss"])) return 1_000;
  return 30_000;
}

function isoWeek(parts: ClockParts) {
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((Number(date) - Number(yearStart) + 86_400_000) / 604_800_000);
}

export function formatDesktopClock(format: string) {
  const parts = currentClockParts();
  const usesAmPm = clockFormatHasToken(format, ["AP", "A", "ap", "a", "aP", "Ap"]);
  const displayHour = usesAmPm ? parts.hour % 12 || 12 : parts.hour;
  const milliseconds = String(parts.millisecond).padStart(3, "0");
  const shortMilliseconds = milliseconds.replace(/0+$/u, "") || "0";
  const values: Record<(typeof qtClockTokens)[number], string> = {
    A: parts.hour < 12 ? "AM" : "PM",
    AP: parts.hour < 12 ? "AM" : "PM",
    Ap: parts.hour < 12 ? "AM" : "PM",
    H: String(parts.hour),
    HH: twoDigits(parts.hour),
    M: String(parts.month),
    MM: twoDigits(parts.month),
    MMM: shortMonths[parts.month - 1],
    MMMM: months[parts.month - 1],
    a: parts.hour < 12 ? "am" : "pm",
    aP: parts.hour < 12 ? "AM" : "PM",
    ap: parts.hour < 12 ? "am" : "pm",
    d: String(parts.day),
    dd: twoDigits(parts.day),
    ddd: shortWeekdays[parts.dayOfWeek - 1],
    dddd: weekdays[parts.dayOfWeek - 1],
    h: String(displayHour),
    hh: twoDigits(displayHour),
    m: String(parts.minute),
    mm: twoDigits(parts.minute),
    s: String(parts.second),
    ss: twoDigits(parts.second),
    t: parts.timeZoneAbbreviation,
    tt: parts.timeZoneOffset.replace(":", ""),
    ttt: parts.timeZoneOffset,
    tttt: parts.timeZoneName,
    yy: twoDigits(parts.year % 100),
    yyyy: String(parts.year),
    z: shortMilliseconds,
    zz: shortMilliseconds,
    zzz: milliseconds,
  };
  const output: string[] = [];
  const withIsoWeek = format.replaceAll("ww", twoDigits(isoWeek(parts)));

  walkClockFormat(
    withIsoWeek,
    (literal) => output.push(literal),
    (token) => output.push(values[token])
  );

  return output.join("");
}

export function getDesktopClockBootstrapScript(elementId: string) {
  const serializedId = JSON.stringify(elementId).replace(/</gu, "\\u003c");
  const serializedWeekdays = JSON.stringify([
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ]).replace(/</gu, "\\u003c");

  return `{var node=document.getElementById(${serializedId});if(node){var date=new Date();var days=${serializedWeekdays};node.textContent=days[date.getDay()]+" "+String(date.getHours()).padStart(2,"0")+":"+String(date.getMinutes()).padStart(2,"0")}}`;
}

export function clockFormatCommand(format: string) {
  return `omarchy bar set omarchy.clock format "${format}"`;
}
