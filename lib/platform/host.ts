export type HostModifierLabel = "Super" | "Windows" | "⌘";

type UserAgentPlatform = {
  platform: string;
};

function isUserAgentPlatform(value: unknown): value is UserAgentPlatform {
  return (
    value !== null &&
    typeof value === "object" &&
    "platform" in value &&
    typeof value.platform === "string"
  );
}

function getModernPlatform() {
  if (!("userAgentData" in navigator)) return;

  const { userAgentData } = navigator;
  return isUserAgentPlatform(userAgentData) ? userAgentData.platform : undefined;
}

export function getHostModifierLabel(): HostModifierLabel {
  if (typeof navigator === "undefined") return "Super";

  const platform = (getModernPlatform() ?? navigator.platform ?? "").toLowerCase();

  if (/mac|iphone|ipad|ipod/u.test(platform)) return "⌘";
  if (/win/u.test(platform)) return "Windows";
  return "Super";
}
