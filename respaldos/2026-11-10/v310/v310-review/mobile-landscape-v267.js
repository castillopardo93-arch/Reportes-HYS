/* v267: normalización de barra móvil en horizontal. Solo presentación. */
(function(){
'use strict';
if(new URLSearchParams(location.search).get('embedded')==='otros')return;
const style=document.createElement('style');style.id='hys267LandscapeFix';
style.textContent=`
html.hys267-landscape,html.hys267-landscape body{max-width:100%!important;overflow-x:hidden!important}
html.hys267-landscape body.hys-tools-visible,
html.hys267-landscape body.hys-tools-expanded{padding:0 0 calc(64px + env(safe-area-inset-bottom))!important;margin:0!important}
html.hys267-landscape #hysToolsRail,
html.hys267-landscape #hysToolsRail.expanded{
position:fixed!important;inset:auto 0 0 0!important;top:auto!important;left:0!important;right:0!important;bottom:0!important;
display:grid!important;grid-template-columns:60px minmax(0,1fr)!important;grid-template-rows:56px!important;
align-items:center!important;justify-content:stretch!important;
width:100vw!important;max-width:100vw!important;min-width:0!important;
height:calc(56px + env(safe-area-inset-bottom))!important;max-height:calc(56px + env(safe-area-inset-bottom))!important;
min-height:0!important;margin:0!important;
padding:0 max(8px,env(safe-area-inset-right)) env(safe-area-inset-bottom) max(8px,env(safe-area-inset-left))!important;
gap:6px!important;overflow:hidden!important;box-sizing:border-box!important;
border-top:1px solid #294d6c!important;border-right:0!important;z-index:1000!important;
transform:none!important;
}
html.hys267-landscape #hysToolsToggle,
html.hys267-landscape #hysToolsRail.expanded #hysToolsToggle{
grid-column:1!important;grid-row:1!important;position:static!important;
display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;
width:56px!important;min-width:0!important;max-width:56px!important;height:48px!important;
padding:2px!important;margin:0!important;gap:0!important;flex:none!important;
font-size:10px!important;
}
html.hys267-landscape #hysToolsToggle .tools-icon{font-size:18px!important}
html.hys267-landscape #hysToolsOptions,
html.hys267-landscape #hysToolsRail.expanded #hysToolsOptions{
grid-column:2!important;grid-row:1!important;position:static!important;
display:flex!important;flex-flow:row nowrap!important;align-items:center!important;justify-content:flex-start!important;
width:100%!important;min-width:0!important;max-width:100%!important;height:54px!important;
padding:0!important;margin:0!important;gap:8px!important;flex:none!important;
overflow-x:auto!important;overflow-y:hidden!important;scrollbar-width:none!important;
-webkit-overflow-scrolling:touch!important;overscroll-behavior-x:contain!important;
}
html.hys267-landscape #hysToolsOptions::-webkit-scrollbar{display:none!important}
html.hys267-landscape #hysToolsOptions .hys-admin-open,
html.hys267-landscape #hysToolsRail.expanded #hysToolsOptions .hys-admin-open{
position:static!important;display:flex!important;flex-direction:row!important;align-items:center!important;
flex:0 0 132px!important;width:132px!important;min-width:132px!important;max-width:132px!important;
height:44px!important;min-height:44px!important;max-height:44px!important;
padding:5px 7px!important;margin:0!important;gap:6px!important;
white-space:normal!important;overflow:hidden!important;box-sizing:border-box!important;
}
html.hys267-landscape #hysToolsOptions .hys-admin-open[hidden]{display:none!important}
html.hys267-landscape #hysToolsOptions .tools-option-icon{
display:grid!important;flex:0 0 24px!important;width:24px!important;height:24px!important;font-size:15px!important}
html.hys267-landscape #hysToolsOptions .tools-option-label{display:block!important;flex:1!important;font-size:11px!important;line-height:1.1!important;overflow-wrap:anywhere!important}
html.hys267-landscape #hysToolsOptions .tools-option-full,
html.hys267-landscape #hysToolsOptions .tools-description{display:none!important}
html.hys267-landscape #moduleChooser{width:100%!important;max-width:100%!important;padding:12px 16px 72px!important}
html.hys267-landscape #moduleChooser .chooser-inner{width:100%!important;max-width:100%!important}
html.hys267-landscape #moduleChooser .module-cards{grid-template-columns:repeat(2,minmax(0,1fr))!important}
html.hys267-landscape #hys265UsersPanel .hys265-shell{max-width:100%!important;width:100%!important;padding:12px!important}
html.hys267-landscape #hys265UsersPanel .hys265-tabs{display:flex!important;flex-flow:row nowrap!important;overflow-x:auto!important}
html.hys267-landscape #hys265UsersPanel .hys265-tabs button{flex:0 0 auto!important}
html.hys267-landscape body.hys-tools-visible #otherAprApp{height:calc(100dvh - 64px - env(safe-area-inset-bottom))!important}
`;
document.head.appendChild(style);
const apply=()=>{
 const landscape=window.innerWidth>window.innerHeight;
 const touch=('ontouchstart' in window)||(navigator.maxTouchPoints||0)>0;
 const compact=landscape&&touch&&Math.min(window.innerWidth,window.innerHeight)<700;
 document.documentElement.classList.toggle('hys267-landscape',compact);
 if(compact){
  const rail=document.getElementById('hysToolsRail');
  rail?.classList.remove('expanded');
  document.body.classList.remove('hys-tools-expanded');
  const toggle=document.getElementById('hysToolsToggle');
  if(toggle)toggle.setAttribute('aria-expanded','false');
 }
};
window.addEventListener('resize',apply,{passive:true});
window.addEventListener('orientationchange',apply,{passive:true});
document.addEventListener('DOMContentLoaded',apply,{once:true});
apply();
})();