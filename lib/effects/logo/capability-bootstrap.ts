import { LOGO_BOOT_STORAGE_KEYS, LOGO_EFFECT_STORAGE_KEYS } from "@/lib/effects/logo/lifecycle";

const logoRendererWatchdogMs = 3_000;

function createLogoCapabilityBootstrapScript() {
  return `(function(){
    var root=document.documentElement;
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
