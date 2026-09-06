import type { StaticImageData } from "next/image";

import catppuccinLatte from "@/assets/theme-wallpapers/catppuccin-latte.webp";
import catppuccin from "@/assets/theme-wallpapers/catppuccin.webp";
import ethereal from "@/assets/theme-wallpapers/ethereal.webp";
import everforest from "@/assets/theme-wallpapers/everforest.webp";
import flexokiLight from "@/assets/theme-wallpapers/flexoki-light.webp";
import gruvbox from "@/assets/theme-wallpapers/gruvbox.webp";
import hackerman from "@/assets/theme-wallpapers/hackerman.webp";
import kanagawa from "@/assets/theme-wallpapers/kanagawa.webp";
import lastHorizon from "@/assets/theme-wallpapers/last-horizon.webp";
import lumon from "@/assets/theme-wallpapers/lumon.webp";
import lupine from "@/assets/theme-wallpapers/lupine.webp";
import matteBlack from "@/assets/theme-wallpapers/matte-black.webp";
import miasma from "@/assets/theme-wallpapers/miasma.webp";
import nord from "@/assets/theme-wallpapers/nord.webp";
import osakaJade from "@/assets/theme-wallpapers/osaka-jade.webp";
import retro82 from "@/assets/theme-wallpapers/retro-82.webp";
import ristretto from "@/assets/theme-wallpapers/ristretto.webp";
import rosePine from "@/assets/theme-wallpapers/rose-pine.webp";
import solitude from "@/assets/theme-wallpapers/solitude.webp";
import tokyoNight from "@/assets/theme-wallpapers/tokyo-night.webp";
import vantablack from "@/assets/theme-wallpapers/vantablack.webp";
import white from "@/assets/theme-wallpapers/white.webp";
import type { OmarchyThemeId } from "@/lib/themes/official";

export const wallpapers = {
  "catppuccin-latte": catppuccinLatte,
  catppuccin,
  ethereal,
  everforest,
  "flexoki-light": flexokiLight,
  gruvbox,
  hackerman,
  kanagawa,
  "last-horizon": lastHorizon,
  lumon,
  lupine,
  "matte-black": matteBlack,
  miasma,
  nord,
  "osaka-jade": osakaJade,
  "retro-82": retro82,
  ristretto,
  "rose-pine": rosePine,
  solitude,
  "tokyo-night": tokyoNight,
  vantablack,
  white,
} satisfies Record<OmarchyThemeId, StaticImageData>;
