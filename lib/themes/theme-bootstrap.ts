import type { StaticImageData } from "next/image";

import { backgroundPreferenceKey } from "@/lib/themes/background";
import { defaultThemeId, omarchyThemes } from "@/lib/themes/official";
import {
  defaultThemeSkewAngle,
  maximumThemeSkewAngle,
  minimumThemeSkewAngle,
  themePreferenceKey,
  themeSkewAnglePreferenceKey,
} from "@/lib/themes/theme-constants";
import { getThemeStyle, type ThemeMode } from "@/lib/themes/themes";

type BootstrapTheme = [mode: ThemeMode, values: string[]];

type ThemeBootstrapConfig = {
  backgroundStorageKey: string;
  wallpapers: Partial<Record<string, Pick<StaticImageData, "src" | "blurDataURL">>>;
  defaultTheme: string;
  properties: string[];
  skewAngle: {
    defaultValue: number;
    maximum: number;
    minimum: number;
    storageKey: string;
  };
  storageKey: string;
  themes: Record<string, BootstrapTheme>;
};

function serializeForInlineScript(value: ThemeBootstrapConfig) {
  return JSON.stringify(value)
    .replace(/</gu, "\\u003c")
    .replace(/\u2028/gu, "\\u2028")
    .replace(/\u2029/gu, "\\u2029");
}

function createBootstrapConfig(
  wallpapers: ThemeBootstrapConfig["wallpapers"]
): ThemeBootstrapConfig {
  const themes: Record<string, BootstrapTheme> = {};
  const properties = Object.keys(getThemeStyle(omarchyThemes[0]));

  for (const theme of omarchyThemes) {
    themes[theme.id] = [theme.mode, Object.values(getThemeStyle(theme))];
  }

  return {
    wallpapers,
    backgroundStorageKey: backgroundPreferenceKey,
    defaultTheme: defaultThemeId,
    properties,
    skewAngle: {
      defaultValue: defaultThemeSkewAngle,
      maximum: maximumThemeSkewAngle,
      minimum: minimumThemeSkewAngle,
      storageKey: themeSkewAnglePreferenceKey,
    },
    storageKey: themePreferenceKey,
    themes,
  };
}

export function getThemeBootstrapScript(wallpapers: ThemeBootstrapConfig["wallpapers"] = {}) {
  const config = serializeForInlineScript(createBootstrapConfig(wallpapers));

  return String.raw`(function(config){
    var root=document.documentElement;
    var themeId=config.defaultTheme;
    var theme=config.themes[themeId];
    var skewAngle=config.skewAngle.defaultValue;
    try {
      var savedTheme=window.localStorage.getItem(config.storageKey);
      if(savedTheme&&Object.prototype.hasOwnProperty.call(config.themes,savedTheme)){
        themeId=savedTheme;
        theme=config.themes[themeId];
      }else if(savedTheme){
        var saved=JSON.parse(savedTheme);
        var candidate=saved&&saved.theme;
        var values=saved&&saved.styleValues;
        var valid=saved&&saved.version===1&&candidate&&candidate.kind==="community"&&/^community:[a-z0-9][a-z0-9-]*$/.test(candidate.id)&&(candidate.mode==="dark"||candidate.mode==="light")&&Array.isArray(values)&&values.length===config.properties.length;
        for(var valueIndex=0;valid&&valueIndex<values.length;valueIndex+=1){
          var property=config.properties[valueIndex];
          var value=values[valueIndex];
          if(typeof value!=="string"){valid=false;break;}
          if(property==="--desktop-wallpaper"){
            valid=value===candidate.wallpaper&&/^linear-gradient\(#[0-9a-f]{6}, #[0-9a-f]{6}\)$/.test(value);
          }else if(property==="--border"){
            valid=/^color-mix\(in srgb, #[0-9a-f]{6} 22%, #[0-9a-f]{6}\)$/.test(value);
          }else{
            valid=/^#[0-9a-f]{6}$/.test(value);
          }
        }
        if(valid){
          themeId=candidate.id;
          theme=[candidate.mode,values];
        }
      }
    } catch (error) {}
    try {
      var savedSkewValue=window.localStorage.getItem(config.skewAngle.storageKey);
      var savedSkewAngle=savedSkewValue!==null&&savedSkewValue.trim()!==""?Number(savedSkewValue):NaN;
      if(Number.isFinite(savedSkewAngle))skewAngle=Math.min(config.skewAngle.maximum,Math.max(config.skewAngle.minimum,savedSkewAngle));
    } catch (error) {}
    if(!theme)return;
    root.dataset.theme=themeId;
    root.style.colorScheme=theme[0];
    root.style.setProperty("--theme-skew-angle",skewAngle+"deg");
    for(var index=0;index<config.properties.length;index+=1)root.style.setProperty(config.properties[index],theme[1][index]);
    var wallpaperId=themeId;
    var solidColor=null;
    try {
      var savedBackground=JSON.parse(window.localStorage.getItem(config.backgroundStorageKey)||"null");
      if(savedBackground&&savedBackground.kind==="experiment"){
        wallpaperId=null;
        solidColor=theme[1][config.properties.indexOf("--background")];
      }else if(savedBackground&&savedBackground.kind==="wallpaper"&&Object.prototype.hasOwnProperty.call(config.themes,savedBackground.themeId)){
        wallpaperId=savedBackground.themeId;
      }else if(savedBackground&&savedBackground.kind==="solid"&&/^#[0-9a-f]{6}$/.test(savedBackground.color)){
        wallpaperId=null;
        solidColor=savedBackground.color;
      }
    } catch (error) {}
    var wallpaper=wallpaperId?config.wallpapers[wallpaperId]:null;
    var wallpaperProperty=config.properties.indexOf("--desktop-wallpaper");
    if(solidColor)root.style.setProperty("--wallpaper-blur","linear-gradient("+solidColor+","+solidColor+")");
    else if(!wallpaper&&wallpaperProperty>=0)root.style.setProperty("--wallpaper-blur",theme[1][wallpaperProperty]);
    if(wallpaper&&window.location&&window.location.pathname==="/"){
      if(wallpaper.blurDataURL)root.style.setProperty("--wallpaper-blur",'url("'+wallpaper.blurDataURL+'")');
      var wallpaperPreload=document.createElement("link");
      wallpaperPreload.rel="preload";
      wallpaperPreload.as="image";
      wallpaperPreload.href=wallpaper.src;
      wallpaperPreload.type="image/webp";
      wallpaperPreload.setAttribute("fetchpriority","high");
      document.head.append(wallpaperPreload);
    }
    var themeColor=document.querySelector('meta[name="theme-color"]');
    var backgroundIndex=config.properties.indexOf("--background");
    if(themeColor&&backgroundIndex>=0)themeColor.setAttribute("content",theme[1][backgroundIndex]);
  })(${config});`;
}
