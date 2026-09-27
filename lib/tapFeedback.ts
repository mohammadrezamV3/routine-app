// بازخوردِ کلیک روی باکس‌های قابل‌کلیک (نه فقط <button> واقعی، خیلی از
// کارت‌ها/ردیف‌ها یک <div onClick> ساده‌اند). دو مشکل با تکیه‌ی صرف روی
// CSS `:active`:
//   ۱) خیلی از این باکس‌ها اصلا قاعده‌ی `:active` اختصاصی ندارند، پس با
//      لمس/کلیک هیچ واکنشی دیده نمی‌شود — کاربر نمی‌فهمد کلیکش گرفته یا نه.
//   ۲) سافاریِ iOS اصلا `:active` را (even اگه تعریف شده باشه) روی عنصری
//      که در مسیر رویدادش یک هندلر لمس نباشد اعمال نمی‌کند.
// راه‌حل یکسان برای موس و لمس: با `pointerdown` نزدیک‌ترین جدِ «قابل‌کلیک»
// (button/a/role=button، یا هر چیزی که cursor:pointer دارد) را پیدا و یک
// کلاس موقت رویش می‌گذاریم؛ با رهاشدن، بعد از یک حداقلِ زمانِ کوتاه (تا
// حتی روی یک تپِ خیلی سریع هم واقعا دیده شود) برداشته می‌شود. چون فقط
// opacity را عوض می‌کند (نه transform)، با انیمیشن‌های اختصاصیِ `:active`ی
// که جاهای دیگر همین پروژه از قبل دارند (day-pill, rm-card, ...) تداخلی
// ندارد و رویشان جمع می‌شود.
export const TAP_FEEDBACK_INIT_SCRIPT = `(function(){try{
var CLS="tap-active",MIN=70,cur=null,timer=null;
function clearCur(){
  if(timer){clearTimeout(timer);timer=null;}
  if(cur){cur.classList.remove(CLS);cur=null;}
}
function findTappable(el){
  var n=el,depth=0;
  while(n&&n.nodeType===1&&depth<8){
    var tag=n.tagName;
    if((tag==="BUTTON"||tag==="INPUT"||tag==="SELECT"||tag==="TEXTAREA")&&n.disabled){
      n=n.parentNode;depth++;continue;
    }
    if(tag==="BUTTON"||tag==="A"||n.getAttribute("role")==="button"||getComputedStyle(n).cursor==="pointer"){
      return n;
    }
    n=n.parentNode;depth++;
  }
  return null;
}
/* هپتیک — لرزشِ خیلی کوتاه روی لمسِ هر چیزِ قابل‌کلیک، تا تپ «حس» بشه.
   اندروید: navigator.vibrate. کروم فقط بعد از اولین تعاملِ کاربر (sticky
   activation) اجازه می‌ده، و pointerdownِ لمسی خودش activation نیست — پس
   تا قبل از اون، لرزش به pointerup (که activation حساب می‌شه) موکول می‌شه.
   iOS (سافاری ۱۸+) vibrate نداره؛ کلیکِ برنامه‌ای روی لیبلِ یک
   <input type=checkbox switch> مخفی هپتیکِ سیستمی رو فعال می‌کنه.
   کاربر با localStorage["arion:haptics"]="off" خاموشش می‌کنه. */
var HAPTIC_MS=8,pendingHaptic=false,iosLabel=null;
function hapticsOff(){try{return localStorage.getItem("arion:haptics")==="off";}catch(_){return false;}} /* هم‌کلید با lib/haptics.ts (HAPTICS_KEY) — تنظیمات › بازخورد لمسی */
function isTextField(el){var t=el.tagName;return t==="TEXTAREA"||(t==="INPUT"&&!/^(checkbox|radio|button|submit|reset|range|color|file)$/i.test(el.type||""));}
function iosHaptic(){
  if(!iosLabel){
    var input=document.createElement("input");input.type="checkbox";input.setAttribute("switch","");
    iosLabel=document.createElement("label");iosLabel.setAttribute("aria-hidden","true");
    iosLabel.style.cssText="position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;overflow:hidden;left:-9px;top:-9px";
    iosLabel.appendChild(input);document.body.appendChild(iosLabel);
  }
  iosLabel.click();
}
var canVibrate=typeof navigator.vibrate==="function";
var isIOS=/iP(hone|ad|od)/.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
function haptic(){
  try{
    if(canVibrate)navigator.vibrate(HAPTIC_MS);
    else if(isIOS)iosHaptic();
  }catch(_){}
}
document.addEventListener("pointerdown",function(e){
  if(typeof e.button==="number"&&e.button!==0)return;
  clearCur();
  var target=findTappable(e.target);
  if(!target)return;
  target.classList.add(CLS);
  cur=target;
  pendingHaptic=false;
  if(e.pointerType==="touch"&&!isTextField(target)&&!hapticsOff()){
    var ua=navigator.userActivation;
    if(canVibrate&&(!ua||ua.hasBeenActive))haptic();else pendingHaptic=true;
  }
},{passive:true});
document.addEventListener("pointerup",function(){
  if(pendingHaptic){pendingHaptic=false;haptic();}
},{passive:true,capture:true});
function release(){
  if(!cur)return;
  var el=cur;
  timer=setTimeout(function(){el.classList.remove(CLS);if(cur===el)cur=null;},MIN);
}
document.addEventListener("pointerup",release,{passive:true});
document.addEventListener("pointercancel",release,{passive:true});
}catch(e){}})();`;
