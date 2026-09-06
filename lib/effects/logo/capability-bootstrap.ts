import { LOGO_BOOT_STORAGE_KEYS, LOGO_EFFECT_STORAGE_KEYS } from "@/lib/effects/logo/lifecycle";
import { LOGO_PREVIEW_DATA_URL, LOGO_PREVIEW_MAX_LENGTH } from "@/lib/effects/logo/preview";

const logoRendererWatchdogMs = 3_000;

function createLogoCapabilityBootstrapScript() {
  return `(function(){
    var root=document.documentElement;
    try {
      var preview=JSON.parse(window.localStorage.getItem(${JSON.stringify(LOGO_EFFECT_STORAGE_KEYS.preview)}));
      if(preview&&preview.version===1&&
        preview.theme===root.dataset.theme&&
        typeof preview.state==="string"&&
        preview.state===window.localStorage.getItem(${JSON.stringify(LOGO_EFFECT_STORAGE_KEYS.state)})&&
        typeof preview.image==="string"&&preview.image.length<=${LOGO_PREVIEW_MAX_LENGTH}&&
        ${LOGO_PREVIEW_DATA_URL}.test(preview.image)){
        var previewBackground='url("'+preview.image+'")';
        root.style.setProperty("--logo-preview",previewBackground);
        root.style.setProperty("--logo-preview-fill","transparent");
        var previewImage=new window.Image();
        previewImage.addEventListener("error",function(){
          if(root.style.getPropertyValue("--logo-preview")!==previewBackground)return;
          root.style.removeProperty("--logo-preview");
          root.style.removeProperty("--logo-preview-fill");
        },{once:true});
        previewImage.src=preview.image;
      }
    } catch (error) {}
    try {
      var storage=window.localStorage;
      var keys=${JSON.stringify(LOGO_BOOT_STORAGE_KEYS)};
      var seenKey=${JSON.stringify(LOGO_EFFECT_STORAGE_KEYS.seen)};
      var restored=false;
      for(var index=0;index<keys.length;index+=1){
        var key=keys[index];
        if(storage.getItem(key)!==null){
          restored=true;
          break;
        }
      }
      if(restored){
        root.dataset.logoBoot="restore";
        try {
          storage.setItem(seenKey,"1");
        } catch (error) {}
      } else {
        storage.setItem(seenKey,"1");
        root.dataset.logoBoot="fresh";
      }
    } catch (error) {
      root.dataset.logoBoot="unknown";
    }
    try {
      root.dataset.logoMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches?"reduce":"animate";
    } catch (error) {
      root.dataset.logoMotion="reduce";
    }
    try {
      root.dataset.logoGpu=navigator.gpu===undefined?"unavailable":"candidate";
    } catch (error) {
      root.dataset.logoGpu="unavailable";
    }
    root.dataset.logoReveal=
      root.dataset.logoBoot==="fresh"&&
      root.dataset.logoMotion==="animate"&&
      root.dataset.logoGpu==="candidate"
        ?"pending"
        :"consumed";
    if(root.dataset.logoGpu!=="candidate")return;
    window.setTimeout(function(){
      root.dataset.logoReveal="consumed";
      var marks=document.querySelectorAll('.omarchy-effects-mark[data-logo-initial-reveal="pending"]:not([data-live="true"])');
      for(var index=0;index<marks.length;index+=1){
        marks[index].dataset.effectStartMode="settled";
        marks[index].dataset.renderer="timeout";
      }
    },${logoRendererWatchdogMs});
  })();`;
}

const logoCapabilityBootstrapScript = createLogoCapabilityBootstrapScript();

export function getLogoCapabilityBootstrapScript() {
  return logoCapabilityBootstrapScript;
}
