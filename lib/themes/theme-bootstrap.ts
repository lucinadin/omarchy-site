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

function createBootstrapConfig(): ThemeBootstrapConfig {
  const themes: Record<string, BootstrapTheme> = {};
  const properties = Object.keys(getThemeStyle(omarchyThemes[0]));

  for (const theme of omarchyThemes) {
    themes[theme.id] = [theme.mode, Object.values(getThemeStyle(theme))];
  }

  return {
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

function createThemeBootstrapScript() {
  const config = serializeForInlineScript(createBootstrapConfig());

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
    var wallpaperIndex=config.properties.indexOf("--desktop-wallpaper");
    if(window.location&&window.location.pathname==="/"&&wallpaperIndex>=0){
      var wallpaperMatch=/^url\("([^"]+)"\)$/.exec(theme[1][wallpaperIndex]);
      if(wallpaperMatch){
        var wallpaperPreload=document.createElement("link");
        wallpaperPreload.rel="preload";
        wallpaperPreload.as="image";
        wallpaperPreload.href=wallpaperMatch[1];
        wallpaperPreload.setAttribute("fetchpriority","high");
        document.head.append(wallpaperPreload);
      }
    }
    var themeColor=document.querySelector('meta[name="theme-color"]');
    var backgroundIndex=config.properties.indexOf("--background");
    if(themeColor&&backgroundIndex>=0)themeColor.setAttribute("content",theme[1][backgroundIndex]);
  })(${config});`;
}

const themeBootstrapScript = createThemeBootstrapScript();

export function getThemeBootstrapScript() {
  return themeBootstrapScript;
}
