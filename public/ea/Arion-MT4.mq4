//+------------------------------------------------------------------+
//|                                                     Arion-MT4.mq4 |
//|            اکسپرت اتصال حساب متاتریدر ۴ به ژورنال ترید Arion       |
//+------------------------------------------------------------------+
//
// این اکسپرت فقط اطلاعات معاملات را می‌خواند و به Arion می‌فرستد.
// هیچ سفارشی باز یا بسته نمی‌کند و هیچ دستوری از سرور نمی‌گیرد.
// رمز حساب معاملاتی شما هیچ‌جا استفاده یا ذخیره نمی‌شود.
//
// نصب:
//   ۱) این فایل را در پوشه‌ی MQL4/Experts ترمینال بگذارید
//   ۲) در MetaEditor بازش کنید و F7 بزنید تا کامپایل شود
//   ۳) در متاتریدر: Tools → Options → Expert Advisors →
//      «Allow WebRequest for listed URL» را تیک بزنید و آدرس سایت Arion را
//      اضافه کنید. (متاتریدر بدون این اجازه هیچ درخواستی نمی‌فرستد.)
//   ۴) اکسپرت را روی یک چارت بیندازید و «کد اتصال» را که در Arion گرفته‌اید
//      در فیلد PairingCode بگذارید
//
// وضعیت اتصال همیشه روی خودِ چارت نوشته می‌شود (گوشه‌ی بالا-چپ) — اگر
// چیزی درست نبود، همان‌جا دلیلش را می‌بینید.
//
#property copyright "Arion"
#property link      "https://arionapp.ir"
#property version   "1.41"
#property strict

input string ArionUrl     = "https://arionapp.ir"; // آدرس سایت Arion
input string PairingCode  = "";                     // کد اتصال (فقط بار اول)
input int    SyncSeconds  = 60;                     // فاصله‌ی ارسال، به ثانیه
input bool   SendScreenshots = true;                // اسکرین چارت لحظه‌ی ورود و خروج هر معامله
input ENUM_TIMEFRAMES ShotTimeframe = PERIOD_M15;   // تایم‌فریم اسکرین
input int    ShotWidth  = 1280;                     // عرض اسکرین (پیکسل)
input int    ShotHeight = 720;                      // ارتفاع اسکرین (پیکسل)

// حداکثر تعداد معامله‌ی بسته‌شده در هر درخواست — تاریخچه‌ی طولانی توی چند
// درخواستِ پشتِ‌سرهم چانک می‌شه، نه یک درخواستِ غول‌پیکرِ تک.
#define MT_CHUNK_SIZE 200
// timeoutِ WebRequest (میلی‌ثانیه). ۱۰ ثانیه برای دسته‌ی بزرگِ بک‌فیل کم بود و
// درخواست قطع می‌شد — یعنی آن دسته و همه‌ی بعدی‌ها هرگز نمی‌رسید.
#define HTTP_TIMEOUT_MS 30000
// هر سینکِ افزایشی این مقدار (ثانیه) به عقب هم نگاه می‌کند؛ ارسالِ تکراری
// بی‌خطر است (سرور با شماره‌ی تیکت ضدتکرار است).
#define CURSOR_OVERLAP 3600

// دیگر لازم نباشد. شماره‌ی حساب کنارش ذخیره می‌شود تا توکنِ حسابِ دیگری
// اشتباهی روی این حساب استفاده نشود.
string   g_token      = "";
datetime g_lastSync   = 0;
string   g_status     = "در حال راه‌اندازی…";
int      g_failCount  = 0;
string   g_tokenFile  = "arion_token.txt";
int      g_tzMinutes  = 0;
bool     g_tzKnown    = false;

// زمانِ close آخرین معامله‌ای که با موفقیت فرستاده شده. صفر یعنی «هنوز هیچ
// بک‌فیلی انجام نشده» — یعنی دفعه‌ی اول کل تاریخچه‌ی حساب فرستاده می‌شود، نه
// فقط چند تای آخر. بعد از اولین بک‌فیلِ کامل، هر سینکِ بعدی فقط معاملاتی که
// از این زمان به بعد بسته شده‌اند را می‌فرستد — همان چیزی که سینک را سریع
// نگه می‌دارد.
//
// کنارش تعدادِ کلِ تاریخچه در لحظه‌ی آخرین سینک هم نگه داشته می‌شود: MT4 فقط
// همان بازه‌ای از تاریخچه را به اکسپرت نشان می‌دهد که در تبِ Account History
// انتخاب شده (مثلا «ماه گذشته»)، و تاریخچه موقعِ باز شدنِ ترمینال هم کم‌کم
// لود می‌شود. قبلا کِرسر همان اول روی آخرین معامله می‌پرید و هر چه بعدا
// (قدیمی‌تر از کِرسر) ظاهر می‌شد هرگز فرستاده نمی‌شد — ریشه‌ی «فقط ۲ تا از
// ۱۰ معامله رسید». حالا اگر تعدادِ کل بیش از معاملاتِ تازه زیاد شد، کلِ
// تاریخچه دوباره فرستاده می‌شود.
int      g_cursorTime  = 0;
int      g_knownTotal  = 0;
string   g_cursorFile  = "arion_cursor_v13.txt";
// نسخه‌ی 1.30: فایل کرسر جدید تا اولین اجرا بعد از آپدیت یک‌بار کل تاریخچه (همراه
// واریز/برداشت و هزینه‌هایی که نسخه‌های قبل نمی‌فرستادن) دوباره فرستاده بشه.

// تا وقتی وصل نشده‌ایم زود‌به‌زود تلاش می‌کنیم (نه با فاصله‌ی ارسالِ کامل)،
// چون معمولا کاربر همین چند دقیقه‌ی اول دارد تنظیمات را درست می‌کند.
#define RETRY_SECONDS 10

// ── اسکرین ورود/خروج (1.40) — سراسری‌ها باید قبل از OnTrade/OnTick تعریف بشن
// صف آپلود: آرایه‌های موازی (ساختار با رشته در MQL4 کپی‌پذیر نیست)
string   g_jobTicket[], g_jobKind[], g_jobFile[];
int      g_jobTries[];
string   g_shotDone  = "|";
datetime g_shotSince = 0;
string   g_shotFile  = "arion_shots_v1.txt";
datetime g_lastCapture = 0;


//+------------------------------------------------------------------+
int OnInit()
  {
   g_token = LoadToken();
   LoadCursor();
   if(SendScreenshots) LoadShotState();
   // تلاشِ اول همین‌جا، ولی *شکستش پایان کار نیست* — تایمر باز هم تلاش
   // می‌کند. باگِ نسخه‌ی قبلی همین بود: اگر این یک تلاش شکست می‌خورد
   // (WebRequest هنوز اجازه نداشت، یا کاربر کد را بعدا می‌گذاشت) اکسپرت
   // تا حذف و نصبِ دوباره برای همیشه «غیرفعال» می‌ماند.
   if(g_token == "") Pair();
   EventSetTimer(g_token == "" ? RETRY_SECONDS : MathMax(15, SyncSeconds));
   // منتظرِ اولین تیکِ تایمر نمی‌مانیم — همین که وصل شدیم (یا توکنِ قبلی را
   // پیدا کردیم)، بلافاصله یک سینک می‌زنیم تا اتصال حسِ آنی داشته باشد.
   if(g_token != "") Sync();
   ShowStatus();
   return(INIT_SUCCEEDED);
  }

void OnDeinit(const int reason) { EventKillTimer(); Comment(""); }

void OnTimer()
  {
   if(g_token == "")
     {
      Pair();
      // به‌محضِ وصل‌شدن، تایمر به فاصله‌ی عادیِ ارسال برمی‌گردد
      if(g_token != "")
        {
         EventKillTimer();
         EventSetTimer(MathMax(15, SyncSeconds));
         Sync();
        }
     }
   else
     {
      Sync();
      CaptureShots();
      UploadShots();
     }
   ShowStatus();
  }

// MT4 رویداد معامله نداره — با هر تیک (حداکثر هر 2 ثانیه) معامله‌ی تازه چک می‌شه
void OnTick()
  {
   if(!SendScreenshots || g_token == "") return;
   if(TimeLocal() - g_lastCapture < 2) return;
   g_lastCapture = TimeLocal();
   CaptureShots();
  }

//+------------------------------------------------------------------+
//| نمایش وضعیت روی چارت                                             |
//+------------------------------------------------------------------+
void ShowStatus()
  {
   string line2 = (g_lastSync > 0 ? "آخرین ارسال: " + TimeToString(g_lastSync, TIME_MINUTES|TIME_SECONDS)
                                  : "هنوز چیزی ارسال نشده");
   Comment("Arion — ", (g_token == "" ? "متصل نیست" : "متصل"), "\n",
           g_status, "\n", line2);
  }

//+------------------------------------------------------------------+
//| ذخیره و خواندن توکن (به‌همراه شماره‌ی حساب) و کِرسر                 |
//+------------------------------------------------------------------+
string LoadToken()
  {
   int h = FileOpen(g_tokenFile, FILE_READ|FILE_TXT);
   if(h == INVALID_HANDLE) return("");
   string line = FileReadString(h);
   FileClose(h);

   int sep = StringFind(line, "|");
   if(sep < 0) return("");          // فرمتِ قدیمی/ناقص — نادیده
   string tok = StringSubstr(line, 0, sep);
   string acc = StringSubstr(line, sep + 1);
   if(acc != IntegerToString(AccountNumber()))
     {
      // توکنِ یک حسابِ دیگر است؛ استفاده‌اش یعنی ریختنِ معاملات توی
      // حسابِ اشتباه در Arion.
      g_status = "توکنِ ذخیره‌شده برای حسابِ دیگری‌ست — کد اتصالِ جدید بگذارید";
      return("");
     }
   return(tok);
  }

void SaveToken(string token)
  {
   int h = FileOpen(g_tokenFile, FILE_WRITE|FILE_TXT);
   if(h == INVALID_HANDLE) { Print("Arion: نوشتن توکن ناموفق"); return; }
   FileWriteString(h, token == "" ? "" : token + "|" + IntegerToString(AccountNumber()));
   FileClose(h);
  }

// فرمت: «cursor|knownTotal|login». فایلِ نسخه‌ی قبل فقط cursor داشت →
// knownTotal=0 → یک‌بار کلِ تاریخچه دوباره فرستاده می‌شود (عمدا).
void LoadCursor()
  {
   g_cursorTime = 0; g_knownTotal = 0;
   int h = FileOpen(g_cursorFile, FILE_READ|FILE_TXT);
   if(h == INVALID_HANDLE) return;
   string s = FileReadString(h);
   FileClose(h);
   string parts[];
   if(StringSplit(s, '|', parts) < 3) return;
   if(parts[2] != IntegerToString(AccountNumber())) return;
   g_cursorTime = (int)StringToInteger(parts[0]);
   g_knownTotal = (int)StringToInteger(parts[1]);
  }

void SaveCursor()
  {
   int h = FileOpen(g_cursorFile, FILE_WRITE|FILE_TXT);
   if(h == INVALID_HANDLE) return;
   FileWriteString(h, IntegerToString(g_cursorTime) + "|" + IntegerToString(g_knownTotal) +
                      "|" + IntegerToString(AccountNumber()));
   FileClose(h);
  }

//+------------------------------------------------------------------+
//| عدد → JSON. NaN/Inf در JSON معتبر نیست و قبلا کلِ دسته را ۴۰۰ می‌کرد. |
//+------------------------------------------------------------------+
string Num(double v, int digits)
  {
   if(!MathIsValidNumber(v)) return("null");
   return(DoubleToString(v, digits));
  }

//+------------------------------------------------------------------+
//| فرار دادنِ کاراکترهای خاصِ JSON                                    |
//+------------------------------------------------------------------+
string JsonEscape(string s)
  {
   string out = "";
   int n = StringLen(s);
   for(int i = 0; i < n; i++)
     {
      ushort c = StringGetCharacter(s, i);
      if(c == '"')       out += "\\\"";
      else if(c == '\\') out += "\\\\";
      else if(c < 32)    out += " ";
      else               out += ShortToString(c);
     }
   return(out);
  }

//+------------------------------------------------------------------+
//| درخواست HTTP                                                     |
//+------------------------------------------------------------------+
string HttpPost(string url, string headers, string body, int &status)
  {
   char post[], result[];
   string resultHeaders;
   // StringLen تعدادِ *کاراکتر* می‌دهد، نه بایتِ UTF-8 — با نامِ بروکر یا
   // سرورِ غیرانگلیسی، بدنه وسطِ یک کاراکتر بریده و JSON خراب می‌شد و
   // سرور ۴۰۰ می‌داد. اندازه‌ی واقعیِ آرایه‌ی بایت‌ها ملاک است.
   int len = StringToCharArray(body, post, 0, WHOLE_ARRAY, CP_UTF8) - 1;
   if(len < 0) len = 0;
   ArrayResize(post, len); // بدون بایت پایانی صفر
   ResetLastError();
   status = WebRequest("POST", url, headers, HTTP_TIMEOUT_MS, post, result, resultHeaders);
   if(status == -1)
     {
      int err = GetLastError();
      if(err == 4060)
         g_status = "WebRequest اجازه ندارد — آدرس «" + ArionUrl + "» را در Tools → Options → Expert Advisors اضافه کنید";
      else
         g_status = "ارتباط با سرور ناموفق (خطای " + IntegerToString(err) + ") — دوباره تلاش می‌شود";
      Print("Arion: ", g_status);
      return("");
     }
   return(CharArrayToString(result, 0, WHOLE_ARRAY, CP_UTF8));
  }

//+------------------------------------------------------------------+
//| اختلافِ ساعتِ سرورِ بروکر با UTC، به دقیقه                          |
//+------------------------------------------------------------------+
int BrokerTzOffsetMinutes()
  {
   // زمانِ معاملات در MT4 زمانِ *سرورِ بروکر* است، نه UTC. Arion همه‌چیز را
   // UTC ذخیره می‌کند، پس همین اختلاف را می‌فرستیم تا سرور تصحیح کند.
   // TimeCurrent زمانِ آخرین تیک است (چند ثانیه عقب؛ آخرِ هفته روزها عقب)،
   // پس به نزدیک‌ترین ۱۵ دقیقه گرد می‌شود و مقدارِ نامعتبر جایگزینِ آخرین
   // مقدارِ درست نمی‌شود.
   int mins = (int)(MathRound((TimeCurrent() - TimeGMT()) / 900.0) * 15);
   if(MathAbs(mins) <= 14 * 60) { g_tzMinutes = mins; g_tzKnown = true; }
   return(g_tzMinutes);
  }

//+------------------------------------------------------------------+
//| اتصال اولیه با کد                                                |
//+------------------------------------------------------------------+
void Pair()
  {
   if(PairingCode == "")
     {
      g_status = "کد اتصال وارد نشده — از Arion کد بگیرید و در PairingCode بگذارید";
      return;
     }

   string body = StringFormat(
      "{\"code\":\"%s\",\"platform\":\"MT4\",\"accountLogin\":\"%d\",\"server\":\"%s\",\"broker\":\"%s\"}",
      JsonEscape(PairingCode), AccountNumber(),
      JsonEscape(AccountServer()), JsonEscape(AccountCompany()));

   int status;
   string res = HttpPost(ArionUrl + "/api/mt/pair", "Content-Type: application/json\r\n", body, status);
   if(status == -1) return;                       // پیامش را خودِ HttpPost گذاشت
   if(status == 401)
     {
      g_status = "کد اتصال اشتباه یا منقضی است — کد تازه بگیرید (هر کد ۱۵ دقیقه معتبر است)";
      Print("Arion: ", g_status);
      return;
     }
   if(status != 200)
     {
      g_status = "اتصال ناموفق (کد " + IntegerToString(status) + ")";
      Print("Arion: ", g_status, " ", res);
      return;
     }

   string token = JsonValue(res, "token");
   if(token == "") { g_status = "پاسخ سرور توکن نداشت"; Print("Arion: ", g_status); return; }

   g_token = token;
   SaveToken(token);
   g_knownTotal = 0; // اتصالِ تازه → کلِ تاریخچه
   g_status = "اتصال برقرار شد";
   Print("Arion: اتصال برقرار شد — در حال گرفتنِ کل تاریخچه‌ی حساب…");
  }

//+------------------------------------------------------------------+
//| یک دسته از معاملات را می‌فرستد (بالانس/اکوئیتی همیشه همراهش می‌رود)  |
//+------------------------------------------------------------------+
bool SendBatch(string itemsJson, bool cash)
  {
   string body = "{\"balance\":" + Num(AccountBalance(), 2) +
                 ",\"equity\":" + Num(AccountEquity(), 2) +
                 ",\"currency\":\"" + JsonEscape(AccountCurrency()) + "\"" +
                 ",\"eaVersion\":\"1.41\"";
   int tz = BrokerTzOffsetMinutes();
   if(g_tzKnown) body += ",\"tzOffsetMinutes\":" + IntegerToString(tz);
   body += (cash ? ",\"trades\":[],\"cashflows\":[" : ",\"trades\":[") + itemsJson + "]}";

   int status;
   string res = HttpPost(ArionUrl + "/api/mt/sync",
                         "Content-Type: application/json\r\nAuthorization: Bearer " + g_token + "\r\n",
                         body, status);

   if(status == -1) return(false);
   if(status == 401)
     {
      // توکن باطل شده (کاربر از پنل ابطالش کرده یا کد جدید گرفته)
      g_token = "";
      SaveToken("");
      g_status = "توکن باطل شده — از Arion کد اتصال جدید بگیرید";
      Print("Arion: ", g_status);
      EventKillTimer();
      EventSetTimer(RETRY_SECONDS);
      return(false);
     }
   if(status != 200)
     {
      g_failCount++;
      g_status = (status == 429 ? "سرور موقتا شلوغ است (۴۲۹) — دوباره تلاش می‌شود"
                                : "ارسال ناموفق (کد " + IntegerToString(status) + ")");
      Print("Arion: ", g_status, " ", res);
      return(false);
     }

   int skipped = JsonInt(res, "skipped");
   int failed  = JsonInt(res, "failed");
   if(skipped > 0 || failed > 0)
      Print("Arion: سرور ", skipped, " ردیفِ نامعتبر و ", failed, " ردیفِ ناموفق گزارش داد");
   g_failCount = 0;
   return(true);
  }

//+------------------------------------------------------------------+
//| فهرستی از رشته‌ها را در دسته‌های MT_CHUNK_SIZE تایی می‌فرستد.        |
//+------------------------------------------------------------------+
bool SendAll(string &items[], bool cash = false)
  {
   int total = ArraySize(items);
   if(total == 0) return(cash ? true : SendBatch("", false));
   int sent = 0;
   while(sent < total)
     {
      int end = MathMin(sent + MT_CHUNK_SIZE, total);
      string chunk = "";
      for(int k = sent; k < end; k++)
        {
         if(k > sent) chunk += ",";
         chunk += items[k];
        }
      // دسته‌ی ناموفق → توقف؛ کِرسر جلو نرفته، پس دفعه‌ی بعد تکرار می‌شود
      if(!SendBatch(chunk, cash)) return(false);
      sent = end;
      if(sent < total) Sleep(500); // زیرِ سقفِ نرخِ سرور می‌ماند
     }
   return(true);
  }

//+------------------------------------------------------------------+
//| ارسال معاملات                                                    |
//+------------------------------------------------------------------+
void Sync()
  {
   // معاملات باز — هر بار کامل فرستاده می‌شوند (سود/حجم/… هر لحظه عوض می‌شود)
   string openItems[]; ArrayResize(openItems, 0);
   for(int i = 0; i < OrdersTotal(); i++)
     {
      if(!OrderSelect(i, SELECT_BY_POS, MODE_TRADES)) continue;
      if(OrderType() > OP_SELL) continue; // فقط خرید/فروش، نه سفارش‌های در انتظار
      int n = ArraySize(openItems); ArrayResize(openItems, n + 1);
      openItems[n] = TradeJson(false);
     }
   if(!SendAll(openItems)) return;

   // معاملاتِ بسته. partial close در MT4 تیکتِ جدا می‌سازد، پس هر تیکت یک ردیف است.
   int total = OrdersHistoryTotal();
   int newAll = 0;
   for(int j = 0; j < total; j++)
     {
      if(!OrderSelect(j, SELECT_BY_POS, MODE_HISTORY)) continue;
      if((int)OrderCloseTime() > g_cursorTime) newAll++;
     }
   // اولین بار، یا تاریخچه‌ی قدیمی‌تر از کِرسر تازه ظاهر شده (لودِ دیرهنگام یا
   // تغییرِ بازه‌ی تبِ Account History) → ارسالِ کامل
   bool full = (g_knownTotal <= 0 || g_cursorTime == 0 || total - g_knownTotal > newAll);
   int since = full ? 0 : g_cursorTime - CURSOR_OVERLAP;

   string batch[]; ArrayResize(batch, 0);
   string cashItems[]; ArrayResize(cashItems, 0);
   int newCursor = g_cursorTime;
   for(int j = 0; j < total; j++)
     {
      if(!OrderSelect(j, SELECT_BY_POS, MODE_HISTORY)) continue;
      int ct = (int)OrderCloseTime();
      if(ct > newCursor) newCursor = ct;
      // نوع 6 (balance: واریز/برداشت و هزینه‌هایی که بروکر با کامنت ثبت می‌کنه مثل
      // مالیات/کمیسیون) و 7 (credit). قبلا نادیده گرفته می‌شد و موجودی ژورنال
      // با موجودی متاتریدر نمی‌خوند.
      if(OrderType() == 6 || OrderType() == 7)
        {
         if(!full && ct < since) continue;
         double amt = OrderProfit() + OrderCommission() + OrderSwap();
         if(amt == 0) continue;
         int bt = (int)OrderOpenTime(); if(bt <= 0) bt = ct;
         string cj = "{\"ticket\":\"" + IntegerToString(OrderTicket()) + "\"" +
                     ",\"type\":\"" + (OrderType() == 7 ? "CREDIT" : "BALANCE") + "\"" +
                     ",\"amount\":" + Num(amt, 2) +
                     ",\"time\":" + IntegerToString(bt) +
                     ",\"comment\":\"" + JsonEscape(OrderComment()) + "\"}";
         int cn = ArraySize(cashItems); ArrayResize(cashItems, cn + 1); cashItems[cn] = cj;
         continue;
        }
      if(OrderType() > OP_SELL) continue;
      if(!full && ct < since) continue;
      int n = ArraySize(batch);
      ArrayResize(batch, n + 1);
      batch[n] = TradeJson(true);
     }

   if(ArraySize(batch) > 0 && !SendAll(batch)) return;
   if(ArraySize(cashItems) > 0 && !SendAll(cashItems, true)) return;

   g_cursorTime = newCursor;
   g_knownTotal = total;
   SaveCursor();
   g_lastSync = TimeCurrent();
   g_status = "ارسال شد: " + IntegerToString(ArraySize(openItems)) + " باز، " +
              IntegerToString(ArraySize(batch)) + " بسته، " +
              IntegerToString(ArraySize(cashItems)) + " واریز/هزینه" +
              (full ? " (کلِ تاریخچه‌ی قابلِ دید — برای همه‌ی معاملات در تبِ Account History «All History» را انتخاب کنید)" : "");
  }

//+------------------------------------------------------------------+
//| JSON یک معامله‌ی انتخاب‌شده                                       |
//+------------------------------------------------------------------+
string TradeJson(bool closed)
  {
   string s = "{\"ticket\":\"" + IntegerToString(OrderTicket()) + "\"" +
              ",\"symbol\":\"" + JsonEscape(OrderSymbol()) + "\"" +
              ",\"type\":\"" + (OrderType() == OP_BUY ? "BUY" : "SELL") + "\"" +
              ",\"volume\":" + Num(OrderLots(), 8) +
              ",\"openPrice\":" + Num(OrderOpenPrice(), 8) +
              ",\"stopLoss\":" + Num(OrderStopLoss(), 8) +
              ",\"takeProfit\":" + Num(OrderTakeProfit(), 8) +
              ",\"profit\":" + Num(OrderProfit(), 2) +
              ",\"commission\":" + Num(OrderCommission(), 2) +
              ",\"swap\":" + Num(OrderSwap(), 2) +
              ",\"openTime\":" + IntegerToString((int)OrderOpenTime());
   if(closed)
      s += ",\"closePrice\":" + Num(OrderClosePrice(), 8) +
           ",\"closeTime\":" + IntegerToString((int)OrderCloseTime()) + ",\"closed\":true}";
   else
      s += ",\"closed\":false}";
   return(s);
  }

//+------------------------------------------------------------------+
//| اسکرین چارت لحظه‌ی ورود و خروج (نسخه‌ی 1.40)                       |
//| برای هر معامله‌ای که بعد از روشن‌شدن این قابلیت باز یا بسته بشه، یک  |
//| چارت موقت از همون نماد باز می‌شه، روی زمان معامله می‌ره، ورود/خروج و |
//| حدضرر/حدسود روش علامت می‌خوره، اسکرین گرفته می‌شه و چارت بسته می‌شه. |
//| تصویر اول روی دیسک می‌مونه و بعد از sync به Arion فرستاده می‌شه (اگه  |
//| معامله هنوز روی سرور نیست، دفعه‌ی بعد دوباره).                      |
//+------------------------------------------------------------------+

void LoadShotState()
  {
   g_shotDone = "|"; g_shotSince = 0;
   int h = FileOpen(g_shotFile, FILE_READ|FILE_TXT|FILE_ANSI);
   if(h != INVALID_HANDLE)
     {
      string head = FileReadString(h);
      string p[];
      if(StringSplit(head, '|', p) >= 2 && p[1] == IntegerToString(AccountNumber()))
        {
         g_shotSince = (datetime)StringToInteger(p[0]);
         while(!FileIsEnding(h))
           {
            string k = FileReadString(h);
            if(k != "") g_shotDone += k + "|";
           }
        }
      FileClose(h);
     }
   if(g_shotSince == 0) { g_shotSince = TimeCurrent(); SaveShotState(); }
  }

void SaveShotState()
  {
   int h = FileOpen(g_shotFile, FILE_WRITE|FILE_TXT|FILE_ANSI);
   if(h == INVALID_HANDLE) return;
   FileWriteString(h, IntegerToString((long)g_shotSince) + "|" + IntegerToString(AccountNumber()) + "\r\n");
   string keys[];
   int n = StringSplit(g_shotDone, '|', keys);
   // فقط 400 کلید آخر نگه داشته می‌شه تا فایل بی‌نهایت بزرگ نشه
   for(int i = MathMax(0, n - 400); i < n; i++) if(keys[i] != "") FileWriteString(h, keys[i] + "\r\n");
   FileClose(h);
  }

bool ShotDone(string key) { return(StringFind(g_shotDone, "|" + key + "|") >= 0); }
void MarkShotDone(string key) { if(!ShotDone(key)) { g_shotDone += key + "|"; SaveShotState(); } }
bool HasShotJob(string key)
  {
   for(int i = 0; i < ArraySize(g_jobTicket); i++) if(g_jobTicket[i] + ":" + g_jobKind[i] == key) return(true);
   return(false);
  }

void ShotObjects(long ch, datetime t1, double p1, datetime t2, double p2, bool buy, double sl, double tp, bool closed)
  {
   color c = buy ? clrDodgerBlue : clrTomato;
   ObjectCreate(ch, "arion_in", buy ? OBJ_ARROW_BUY : OBJ_ARROW_SELL, 0, t1, p1);
   if(closed)
     {
      ObjectCreate(ch, "arion_out", OBJ_ARROW_STOP, 0, t2, p2);
      ObjectSetInteger(ch, "arion_out", OBJPROP_COLOR, clrGold);
      ObjectCreate(ch, "arion_line", OBJ_TREND, 0, t1, p1, t2, p2);
      ObjectSetInteger(ch, "arion_line", OBJPROP_COLOR, c);
      ObjectSetInteger(ch, "arion_line", OBJPROP_STYLE, STYLE_DOT);
      ObjectSetInteger(ch, "arion_line", OBJPROP_RAY, false);
     }
   if(sl > 0) { ObjectCreate(ch, "arion_sl", OBJ_HLINE, 0, 0, sl); ObjectSetInteger(ch, "arion_sl", OBJPROP_COLOR, clrRed); ObjectSetInteger(ch, "arion_sl", OBJPROP_STYLE, STYLE_DASH); }
   if(tp > 0) { ObjectCreate(ch, "arion_tp", OBJ_HLINE, 0, 0, tp); ObjectSetInteger(ch, "arion_tp", OBJPROP_COLOR, clrLimeGreen); ObjectSetInteger(ch, "arion_tp", OBJPROP_STYLE, STYLE_DASH); }
  }

//| چارت موقت → اسکرین → فایل. true یعنی فایل ساخته شد.                 |
bool TakeShot(string symbol, datetime t1, double p1, datetime t2, double p2, bool buy,
              double sl, double tp, bool closed, string file)
  {
   SymbolSelect(symbol, true);
   // داده‌ی تایم‌فریم ممکنه هنوز دانلود نشده باشه — حداکثر 3 ثانیه صبر
   MqlRates r[];
   for(int k = 0; k < 30; k++)
     {
      if(CopyRates(symbol, ShotTimeframe, 0, 300, r) > 0) break;
      Sleep(100);
     }
   long ch = ChartOpen(symbol, ShotTimeframe);
   if(ch == 0) return(false);
   ChartSetInteger(ch, CHART_AUTOSCROLL, false);
   ChartSetInteger(ch, CHART_SHIFT, true);
   ChartSetInteger(ch, CHART_MODE, CHART_CANDLES);
   ChartSetInteger(ch, CHART_SHOW_GRID, false);
   ShotObjects(ch, t1, p1, t2, p2, buy, sl, tp, closed);
   // زمان معامله (برای بسته: خروج) نزدیک لبه‌ی راست با کمی فاصله
   int shift = iBarShift(symbol, ShotTimeframe, closed ? t2 : t1, false);
   ChartNavigate(ch, CHART_END, -(int)MathMax(0, shift - 12));
   ChartRedraw(ch);
   Sleep(400);
   bool ok = ChartScreenShot(ch, file, ShotWidth, ShotHeight, ALIGN_RIGHT);
   // ذخیره‌ی فایل ممکنه کمی بعد تموم بشه؛ قبل از بستن چارت تا 3 ثانیه صبر
   for(int w = 0; ok && w < 30 && !FileIsExist(file); w++) Sleep(100);
   ChartClose(ch);
   if(ok && !FileIsExist(file)) ok = false;
   return(ok);
  }

void QueueShot(string ticket, string kind, string symbol, datetime t1, double p1, datetime t2, double p2,
               bool buy, double sl, double tp, bool closed)
  {
   string key = ticket + ":" + kind;
   if(ShotDone(key) || HasShotJob(key)) return;
   string file = "arion_shot_" + ticket + "_" + kind + ".png";
   if(!TakeShot(symbol, t1, p1, t2, p2, buy, sl, tp, closed, file)) { Print("Arion: اسکرین ناموفق ", key); return; }
   int n = ArraySize(g_jobTicket);
   ArrayResize(g_jobTicket, n + 1); ArrayResize(g_jobKind, n + 1); ArrayResize(g_jobFile, n + 1); ArrayResize(g_jobTries, n + 1);
   g_jobTicket[n] = ticket; g_jobKind[n] = kind; g_jobFile[n] = file; g_jobTries[n] = 0;
  }

//| معاملات تازه‌ای که اسکرین ندارن → اسکرین (حداکثر 3 تا در هر بار)      |
void CaptureShots()
  {
   if(!SendScreenshots || g_token == "" || g_shotSince == 0) return;
   int made = 0;
   // ورود: سفارش‌های باز که بعد از روشن‌شدن قابلیت باز شدن
   for(int i = 0; i < OrdersTotal() && made < 3; i++)
     {
      if(!OrderSelect(i, SELECT_BY_POS, MODE_TRADES)) continue;
      if(OrderType() > OP_SELL || OrderOpenTime() < g_shotSince) continue;
      string id = IntegerToString(OrderTicket());
      if(ShotDone(id + ":entry") || HasShotJob(id + ":entry")) continue;
      QueueShot(id, "entry", OrderSymbol(), OrderOpenTime(), OrderOpenPrice(), 0, 0,
                OrderType() == OP_BUY, OrderStopLoss(), OrderTakeProfit(), false);
      made++;
     }
   // خروج: سفارش‌هایی که بعد از روشن‌شدن قابلیت بسته شدن
   for(int j = OrdersHistoryTotal() - 1; j >= 0 && made < 3; j--)
     {
      if(!OrderSelect(j, SELECT_BY_POS, MODE_HISTORY)) continue;
      if(OrderType() > OP_SELL || OrderCloseTime() < g_shotSince) continue;
      string id = IntegerToString(OrderTicket());
      if(ShotDone(id + ":exit") || HasShotJob(id + ":exit")) continue;
      QueueShot(id, "exit", OrderSymbol(), OrderOpenTime(), OrderOpenPrice(), OrderCloseTime(), OrderClosePrice(),
                OrderType() == OP_BUY, OrderStopLoss(), OrderTakeProfit(), true);
      made++;
     }
  }

//| فرستادن اسکرین‌های آماده به Arion                                    |
void UploadShots()
  {
   if(g_token == "") return;
   for(int i = ArraySize(g_jobTicket) - 1; i >= 0; i--)
     {
      string key = g_jobTicket[i] + ":" + g_jobKind[i];
      int h = FileOpen(g_jobFile[i], FILE_READ|FILE_BIN);
      bool drop = false;
      if(h == INVALID_HANDLE) drop = true;
      else
        {
         uchar data[], b64[], none[];
         FileReadArray(h, data);
         FileClose(h);
         CryptEncode(CRYPT_BASE64, data, none, b64);
         // base64 متاتریدر ممکنه خط‌شکن داشته باشه؛ خط‌شکن خام داخل رشته‌ی JSON نامعتبره
         string img = CharArrayToString(b64, 0, WHOLE_ARRAY, CP_ACP);
         StringReplace(img, "\r", "");
         StringReplace(img, "\n", "");
         string body = "{\"ticket\":\"" + g_jobTicket[i] + "\",\"kind\":\"" + g_jobKind[i] +
                       "\",\"image\":\"data:image/png;base64," + img + "\"}";
         int status;
         HttpPost(ArionUrl + "/api/mt/screenshot",
                  "Content-Type: application/json\r\nAuthorization: Bearer " + g_token + "\r\n", body, status);
         if(status == 200 || status == 400 || status == 413) { MarkShotDone(key); drop = true; }
         else if(status == 401) return;
         else if(++g_jobTries[i] >= 20) drop = true; // 404 (هنوز sync نشده) یا خطای شبکه → بعدا
        }
      if(drop)
        {
         FileDelete(g_jobFile[i]);
         int last = ArraySize(g_jobTicket) - 1;
         for(int k = i; k < last; k++)
           {
            g_jobTicket[k] = g_jobTicket[k + 1]; g_jobKind[k] = g_jobKind[k + 1];
            g_jobFile[k] = g_jobFile[k + 1]; g_jobTries[k] = g_jobTries[k + 1];
           }
         ArrayResize(g_jobTicket, last); ArrayResize(g_jobKind, last); ArrayResize(g_jobFile, last); ArrayResize(g_jobTries, last);
        }
     }
  }


//+------------------------------------------------------------------+
//| استخراج مقدار رشته‌ای از JSON — فقط برای پاسخ ساده‌ی /pair        |
//+------------------------------------------------------------------+
string JsonValue(string json, string key)
  {
   string needle = "\"" + key + "\":\"";
   int start = StringFind(json, needle);
   if(start < 0) return("");
   start += StringLen(needle);
   int end = StringFind(json, "\"", start);
   if(end < 0) return("");
   return(StringSubstr(json, start, end - start));
  }
int JsonInt(string json, string key)
  {
   string needle = "\"" + key + "\":";
   int start = StringFind(json, needle);
   if(start < 0) return(0);
   return((int)StringToInteger(StringSubstr(json, start + StringLen(needle), 12)));
  }
//+------------------------------------------------------------------+
