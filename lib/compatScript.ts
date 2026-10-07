// جایگزین‌های سبک برای APIهای جاوااسکریپت که روی مرورگرهای قدیمی موبایل
// (iOS Safari 13، کروم/وب‌ویو 70 تا 72) نیستن. هر کدوم فقط وقتی نصب می‌شه که
// API خود مرورگر وجود نداشته باشه، پس مرورگر مدرن هیچ تغییری نمی‌بینه.
//
// چرا اسکریپت inline و نه import: باید *قبل* از اجرای باندل اپ بیاد (بعضی
// فایل‌ها در سطح ماژول Object.fromEntries صدا می‌زنن) و باندل رو هم SWC برای
// همین مرورگرها ترنسپایل می‌کنه ولی APIها رو نه. این رشته ترنسپایل نمی‌شه، پس
// فقط ES5 (بدون ?. ، ??، => ، let/const).
//
// مهم‌ترینش MediaQueryList.addEventListener ـه: سافاری قبل از 14 فقط
// addListener داره و بدون این، هر useEffect که mq.addEventListener("change")
// صدا می‌زنه صفحه رو با خطا می‌اندازه.
export const COMPAT_POLYFILLS_SCRIPT = `(function(){try{
var w=window,O=Object,A=Array,S=String,P=A.prototype;
function def(o,k,f){if(!o[k]){try{O.defineProperty(o,k,{value:f,writable:true,configurable:true})}catch(e){o[k]=f}}}
if(w.MediaQueryList&&!MediaQueryList.prototype.addEventListener){
def(MediaQueryList.prototype,"addEventListener",function(t,f){if(t==="change"&&f)this.addListener(f)});
def(MediaQueryList.prototype,"removeEventListener",function(t,f){if(t==="change"&&f)this.removeListener(f)});
}
def(O,"fromEntries",function(it){var o={};A.from(it).forEach(function(e){o[e[0]]=e[1]});return o});
def(O,"hasOwn",function(o,k){return O.prototype.hasOwnProperty.call(o,k)});
def(P,"at",function(i){i=Math.trunc(i)||0;if(i<0)i+=this.length;return this[i]});
def(S.prototype,"at",function(i){i=Math.trunc(i)||0;if(i<0)i+=this.length;return this.charAt(i)});
def(S.prototype,"replaceAll",function(a,b){
if(a instanceof RegExp){if(!a.global)throw new TypeError("replaceAll must be called with a global RegExp");return this.replace(a,b)}
return this.split(S(a)).join(typeof b==="function"?b(S(a)):b)});
def(S.prototype,"matchAll",function(re){
var r=new RegExp(re.source,re.flags.indexOf("g")<0?re.flags+"g":re.flags),s=S(this),out=[],m;
while((m=r.exec(s))){out.push(m);if(m[0]==="")r.lastIndex++}
return out});
def(Promise,"allSettled",function(ps){return Promise.all(A.from(ps).map(function(p){
return Promise.resolve(p).then(function(v){return{status:"fulfilled",value:v}},function(e){return{status:"rejected",reason:e}})}))});
if(typeof w.queueMicrotask!=="function")w.queueMicrotask=function(f){Promise.resolve().then(f)};
if(typeof w.ResizeObserver!=="function"){
w.ResizeObserver=function(cb){
var els=[],self=this,t=0;
function run(){t=0;if(!els.length)return;cb(els.map(function(el){var r=el.getBoundingClientRect();return{target:el,contentRect:{width:r.width,height:r.height,top:0,left:0,right:r.width,bottom:r.height,x:0,y:0}}}),self)}
function kick(){if(!t)t=setTimeout(run,60)}
this.observe=function(el){if(els.indexOf(el)<0)els.push(el);if(els.length===1)w.addEventListener("resize",kick);kick()};
this.unobserve=function(el){var i=els.indexOf(el);if(i>=0)els.splice(i,1);if(!els.length)w.removeEventListener("resize",kick)};
this.disconnect=function(){els=[];w.removeEventListener("resize",kick)};
};
}
}catch(e){}})();`;
