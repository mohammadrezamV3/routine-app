//+------------------------------------------------------------------+
//|                                                     Arion-MT4.mq4 |
//|            اکسپرت اتصال حساب متاتریدر ۴ به ژورنال ترید Arion       |
//+------------------------------------------------------------------+
//
// این اکسپرت اطلاعات معاملات را می‌خواند و به Arion می‌فرستد. هیچ سفارشی باز
// نمی‌کند. فقط اگر خودتان در Arion «مدیریت سرمایه» را برای همین حساب روشن کرده
// باشید، قوانین همان‌جا را روی پوزیشن‌های همین حساب اجرا می‌کند (بستن/کم‌کردن
// حجم/جابه‌جایی حد ضرر). با ورودی EnableMoneyManagement=false کاملا خاموش می‌شود.
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
// وضعیت اتصال همیشه روی خود چارت نوشته می‌شود (گوشه‌ی بالا-چپ) — اگر
// چیزی درست نبود، همان‌جا دلیلش را می‌بینید.
//
#property copyright "Arion"
#property link      "https://arionapp.ir"
#property version   "1.43"
#property strict

#define EA_VERSION "1.43"

input string ArionUrl     = "https://arionapp.ir"; // آدرس سایت Arion
input string PairingCode  = "";                     // کد اتصال (فقط بار اول)
input int    SyncSeconds  = 60;                     // فاصله‌ی ارسال، به ثانیه
input bool   SendScreenshots = true;                // اسکرین چارت لحظه‌ی ورود و خروج هر معامله
input ENUM_TIMEFRAMES ShotTimeframe = PERIOD_M15;   // تایم‌فریم اسکرین
input int    ShotWidth  = 1280;                     // عرض اسکرین (پیکسل)
input int    ShotHeight = 720;                      // ارتفاع اسکرین (پیکسل)
input bool   EnableMoneyManagement = true;          // اجرای قوانین مدیریت سرمایه‌ی Arion (اگر در سایت روشن باشد)

// حداکثر تعداد معامله‌ی بسته‌شده در هر درخواست — تاریخچه‌ی طولانی توی چند
// درخواست پشت‌سرهم چانک می‌شه، نه یک درخواست غول‌پیکر تک.
#define MT_CHUNK_SIZE 200
// timeout WebRequest (میلی‌ثانیه). ۱۰ ثانیه برای دسته‌ی بزرگ بک‌فیل کم بود و
// درخواست قطع می‌شد — یعنی آن دسته و همه‌ی بعدی‌ها هرگز نمی‌رسید.
#define HTTP_TIMEOUT_MS 30000
// هر سینک افزایشی این مقدار (ثانیه) به عقب هم نگاه می‌کند؛ ارسال تکراری
// بی‌خطر است (سرور با شماره‌ی تیکت ضدتکرار است).
#define CURSOR_OVERLAP 3600

// دیگر لازم نباشد. شماره‌ی حساب کنارش ذخیره می‌شود تا توکن حساب دیگری
// اشتباهی روی این حساب استفاده نشود.
string   g_token      = "";
datetime g_lastSync   = 0;
string   g_status     = "در حال راه‌اندازی…";
int      g_failCount  = 0;
string   g_tokenFile  = "arion_token.txt";
int      g_tzMinutes  = 0;
bool     g_tzKnown    = false;

// زمان close آخرین معامله‌ای که با موفقیت فرستاده شده. صفر یعنی «هنوز هیچ
// بک‌فیلی انجام نشده» — یعنی دفعه‌ی اول کل تاریخچه‌ی حساب فرستاده می‌شود، نه
// فقط چند تای آخر. بعد از اولین بک‌فیل کامل، هر سینک بعدی فقط معاملاتی که
// از این زمان به بعد بسته شده‌اند را می‌فرستد — همان چیزی که سینک را سریع
// نگه می‌دارد.
//
// کنارش تعداد کل تاریخچه در لحظه‌ی آخرین سینک هم نگه داشته می‌شود: MT4 فقط
// همان بازه‌ای از تاریخچه را به اکسپرت نشان می‌دهد که در تب Account History
// انتخاب شده (مثلا «ماه گذشته»)، و تاریخچه موقع باز شدن ترمینال هم کم‌کم
// لود می‌شود. قبلا کرسر همان اول روی آخرین معامله می‌پرید و هر چه بعدا
// (قدیمی‌تر از کرسر) ظاهر می‌شد هرگز فرستاده نمی‌شد — ریشه‌ی «فقط ۲ تا از
// ۱۰ معامله رسید». حالا اگر تعداد کل بیش از معاملات تازه زیاد شد، کل
// تاریخچه دوباره فرستاده می‌شود.
int      g_cursorTime  = 0;
int      g_knownTotal  = 0;
string   g_cursorFile  = "arion_cursor_v13.txt";
// نسخه‌ی 1.30: فایل کرسر جدید تا اولین اجرا بعد از آپدیت یک‌بار کل تاریخچه (همراه
// واریز/برداشت و هزینه‌هایی که نسخه‌های قبل نمی‌فرستادن) دوباره فرستاده بشه.

// تا وقتی وصل نشده‌ایم زود‌به‌زود تلاش می‌کنیم (نه با فاصله‌ی ارسال کامل)،
// چون معمولا کاربر همین چند دقیقه‌ی اول دارد تنظیمات را درست می‌کند.
#define RETRY_SECONDS 10

// ── اسکرین ورود/خروج (1.40) — سراسری‌ها باید قبل از OnTrade/OnTick تعریف بشن
// صف آپلود: آرایه‌های موازی (ساختار با رشته در MQL4 کپی‌پذیر نیست)
string   g_jobTicket[], g_jobKind[], g_jobFile[];
int      g_jobTries[];
string   g_shotDone  = "|";
datetime g_shotSince = 0;
// 1.42: فایل وضعیت تازه. نسخه‌ی 1.40 اسکرین‌هایی رو که سرور رد کرده بود (400) هم
// «انجام‌شده» ثبت می‌کرد و دیگه هیچ‌وقت دوباره نمی‌گرفت؛ با فایل تازه همون معاملات
// (از همون زمان شروع قبلی) یک بار دیگه اسکرین می‌گیرن.
string   g_shotFile  = "arion_shots_v2.txt";
string   g_shotFileOld = "arion_shots_v1.txt";
// اسکرین‌هایی که سرور به‌خاطر حجم (413) رد کرد و با اندازه‌ی کوچک‌تر دوباره گرفته می‌شن
string   g_shotSmall = "|";
// عیب‌یابی: آخرین خطای اسکرین (همراه sync به Arion می‌ره و در پنل اتصال دیده می‌شه)
string   g_shotErr   = "";
int      g_shotOk    = 0;
int      g_httpErr   = 0;
datetime g_lastCapture = 0;

// ── مدیریت سرمایه (1.43) ────────────────────────────────────────────────
// قوانین از پاسخ sync (کلید mm) می‌آیند و فقط وقتی کاربر در Arion روشنشان کرده.
// با EnableMoneyManagement=false این بخش روی این ترمینال کاملا خاموش می‌ماند.
#define MM_EVENTS_MAX 100
bool     g_mmOn = false;
double   g_mmRiskPct = 0, g_mmAutoSL = 0, g_mmMaxLoss = 0, g_mmTarget = 0, g_mmBeR = 0, g_mmTrStart = 0, g_mmTrDist = 0;
bool     g_mmReqSL = false, g_mmLockT = false;
int      g_mmGrace = 60, g_mmMaxOpen = 0, g_mmMaxDaily = 0, g_mmBeOff = 0;
// وضعیت روز سرور
int      g_mmDay = -1;
double   g_mmDayBal = 0, g_mmClosed = 0;
int      g_mmLock = 0;          // 0 آزاد، 1 قفل ضرر روزانه، 2 قفل هدف سود
int      g_mmKilled = 0;        // پوزیشن‌هایی که امروز با سقف روزانه بسته شدن
int      g_mmOpenedToday = 0, g_mmLastCnt = -1;
datetime g_mmStatsAt = 0;
uint     g_mmLastRun = 0;
datetime g_lastWork = 0;
string   g_mmLastErr = "";
datetime g_mmLastErrAt = 0;
// بافر رویدادها (در sync بعدی به صورت mmEvents می‌ره)
string   g_evT[], g_evAct[], g_evTk[], g_evDet[];
// فاصله‌ی ریسک اولیه‌ی هر پوزیشن (برای R) و زمان اولین دیدن پوزیشن بدون SL
int      g_pId[];  double g_pDist[];
int      g_nsId[]; datetime g_nsAt[];
string   g_trailLogged = "|";


//+------------------------------------------------------------------+
int OnInit()
  {
   g_token = LoadToken();
   LoadCursor();
   MmLoadRules(); MmLoadDay(); MmLoadDist();
   if(SendScreenshots) { LoadShotState(); RestoreShotJobs(); }
   // تلاش اول همین‌جا، ولی *شکستش پایان کار نیست* — تایمر باز هم تلاش
   // می‌کند. باگ نسخه‌ی قبلی همین بود: اگر این یک تلاش شکست می‌خورد
   // (WebRequest هنوز اجازه نداشت، یا کاربر کد را بعدا می‌گذاشت) اکسپرت
   // تا حذف و نصب دوباره برای همیشه «غیرفعال» می‌ماند.
   if(g_token == "") Pair();
   ApplyTimer();
   // منتظر اولین تیک تایمر نمی‌مانیم — همین که وصل شدیم (یا توکن قبلی را
   // پیدا کردیم)، بلافاصله یک سینک می‌زنیم تا اتصال حس آنی داشته باشد.
   if(g_token != "") { g_lastWork = TimeLocal(); Sync(); }
   ShowStatus();
   return(INIT_SUCCEEDED);
  }

void OnDeinit(const int reason) { EventKillTimer(); Comment(""); }

void OnTimer()
  {
   if(g_token == "")
     {
      Pair();
      // به‌محض وصل‌شدن، تایمر به فاصله‌ی عادی ارسال برمی‌گردد
      if(g_token != "")
        {
         ApplyTimer();
         g_lastWork = TimeLocal();
         Sync();
        }
     }
   else
     {
      // قوانین مدیریت سرمایه هر ثانیه؛ sync و اسکرین با فاصله‌ی عادی
      MmRun();
      if(g_lastWork == 0 || TimeLocal() - g_lastWork >= MathMax(15, SyncSeconds) - 1)
        {
         g_lastWork = TimeLocal();
         Sync();
         CaptureShots();
         UploadShots();
        }
     }
   ShowStatus();
  }

// MT4 رویداد معامله نداره — با هر تیک (حداکثر هر 2 ثانیه) معامله‌ی تازه چک می‌شه
void OnTick()
  {
   MmRun();
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
           g_status, "\n", line2, "\n", ShotStatusLine(), "\n", MmStatusLine());
  }

string ShotStatusLine()
  {
   if(!SendScreenshots) return("اسکرین: خاموش");
   string s = "اسکرین: " + IntegerToString(g_shotOk) + " فرستاده شد";
   if(ArraySize(g_jobTicket) > 0) s += "، " + IntegerToString(ArraySize(g_jobTicket)) + " در صف";
   if(g_shotErr != "") s += " — آخرین خطا: " + g_shotErr;
   return(s);
  }

//+------------------------------------------------------------------+
//| ذخیره و خواندن توکن (به‌همراه شماره‌ی حساب) و کرسر                 |
//+------------------------------------------------------------------+
string LoadToken()
  {
   int h = FileOpen(g_tokenFile, FILE_READ|FILE_TXT);
   if(h == INVALID_HANDLE) return("");
   string line = FileReadString(h);
   FileClose(h);

   int sep = StringFind(line, "|");
   if(sep < 0) return("");          // فرمت قدیمی/ناقص — نادیده
   string tok = StringSubstr(line, 0, sep);
   string acc = StringSubstr(line, sep + 1);
   if(acc != IntegerToString(AccountNumber()))
     {
      // توکن یک حساب دیگر است؛ استفاده‌اش یعنی ریختن معاملات توی
      // حساب اشتباه در Arion.
      g_status = "توکن ذخیره‌شده برای حساب دیگری‌ست — کد اتصال جدید بگذارید";
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

// فرمت: «cursor|knownTotal|login». فایل نسخه‌ی قبل فقط cursor داشت →
// knownTotal=0 → یک‌بار کل تاریخچه دوباره فرستاده می‌شود (عمدا).
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
//| عدد → JSON. NaN/Inf در JSON معتبر نیست و قبلا کل دسته را ۴۰۰ می‌کرد. |
//+------------------------------------------------------------------+
string Num(double v, int digits)
  {
   if(!MathIsValidNumber(v)) return("null");
   return(DoubleToString(v, digits));
  }

//+------------------------------------------------------------------+
//| فرار دادن کاراکترهای خاص JSON                                    |
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
   // StringLen تعداد *کاراکتر* می‌دهد، نه بایت UTF-8 — با نام بروکر یا
   // سرور غیرانگلیسی، بدنه وسط یک کاراکتر بریده و JSON خراب می‌شد و
   // سرور ۴۰۰ می‌داد. اندازه‌ی واقعی آرایه‌ی بایت‌ها ملاک است.
   int len = StringToCharArray(body, post, 0, WHOLE_ARRAY, CP_UTF8) - 1;
   if(len < 0) len = 0;
   ArrayResize(post, len); // بدون بایت پایانی صفر
   ResetLastError();
   status = WebRequest("POST", url, headers, HTTP_TIMEOUT_MS, post, result, resultHeaders);
   if(status == -1)
     {
      int err = GetLastError();
      g_httpErr = err;
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
//| اختلاف ساعت سرور بروکر با UTC، به دقیقه                          |
//+------------------------------------------------------------------+
int BrokerTzOffsetMinutes()
  {
   // زمان معاملات در MT4 زمان *سرور بروکر* است، نه UTC. Arion همه‌چیز را
   // UTC ذخیره می‌کند، پس همین اختلاف را می‌فرستیم تا سرور تصحیح کند.
   // TimeCurrent زمان آخرین تیک است (چند ثانیه عقب؛ آخر هفته روزها عقب)،
   // پس به نزدیک‌ترین ۱۵ دقیقه گرد می‌شود و مقدار نامعتبر جایگزین آخرین
   // مقدار درست نمی‌شود.
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
   if(status == -1) return;                       // پیامش را خود HttpPost گذاشت
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
   g_knownTotal = 0; // اتصال تازه → کل تاریخچه
   g_status = "اتصال برقرار شد";
   Print("Arion: اتصال برقرار شد — در حال گرفتن کل تاریخچه‌ی حساب…");
  }

//+------------------------------------------------------------------+
//| یک دسته از معاملات را می‌فرستد (بالانس/اکوئیتی همیشه همراهش می‌رود)  |
//+------------------------------------------------------------------+
bool SendBatch(string itemsJson, bool cash)
  {
   string body = "{\"balance\":" + Num(AccountBalance(), 2) +
                 ",\"equity\":" + Num(AccountEquity(), 2) +
                 ",\"currency\":\"" + JsonEscape(AccountCurrency()) + "\"" +
                 ",\"eaVersion\":\"" + EA_VERSION + "\"";
   int tz = BrokerTzOffsetMinutes();
   if(g_tzKnown) body += ",\"tzOffsetMinutes\":" + IntegerToString(tz);
   body += ",\"shots\":{\"on\":" + (SendScreenshots ? "true" : "false") +
           ",\"ok\":" + IntegerToString(g_shotOk) +
           ",\"queue\":" + IntegerToString(ArraySize(g_jobTicket)) +
           ",\"err\":\"" + JsonEscape(g_shotErr) + "\"}";
   int mmSent = 0;
   if(ArraySize(g_evAct) > 0) body += ",\"mmEvents\":" + MmEventsJson(mmSent);
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
      ApplyTimer();
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
      Print("Arion: سرور ", skipped, " ردیف نامعتبر و ", failed, " ردیف ناموفق گزارش داد");
   g_failCount = 0;
   MmDropEvents(mmSent);
   MmApplyResponse(res);
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
      // دسته‌ی ناموفق → توقف؛ کرسر جلو نرفته، پس دفعه‌ی بعد تکرار می‌شود
      if(!SendBatch(chunk, cash)) return(false);
      sent = end;
      if(sent < total) Sleep(500); // زیر سقف نرخ سرور می‌ماند
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

   // معاملات بسته. partial close در MT4 تیکت جدا می‌سازد، پس هر تیکت یک ردیف است.
   int total = OrdersHistoryTotal();
   int newAll = 0;
   for(int j = 0; j < total; j++)
     {
      if(!OrderSelect(j, SELECT_BY_POS, MODE_HISTORY)) continue;
      if((int)OrderCloseTime() > g_cursorTime) newAll++;
     }
   // اولین بار، یا تاریخچه‌ی قدیمی‌تر از کرسر تازه ظاهر شده (لود دیرهنگام یا
   // تغییر بازه‌ی تب Account History) → ارسال کامل
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
              (full ? " (کل تاریخچه‌ی قابل دید — برای همه‌ی معاملات در تب Account History «All History» را انتخاب کنید)" : "");
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
   else
     {
      // اولین اجرای 1.42: زمان شروع از فایل قبلی، ولی فهرست «انجام‌شده» نه
      int o = FileOpen(g_shotFileOld, FILE_READ|FILE_TXT|FILE_ANSI);
      if(o != INVALID_HANDLE)
        {
         string head = FileReadString(o);
         FileClose(o);
         string p[];
         if(StringSplit(head, '|', p) >= 2 && p[1] == IntegerToString(AccountNumber()))
            g_shotSince = (datetime)StringToInteger(p[0]);
        }
     }
   // TimeCurrent() موقع باز شدن ترمینال (قبل از اولین اتصال) می‌تونه صفر باشه؛
   // اون موقع CaptureShots خودش بعدا زمان شروع رو ست می‌کنه (قبلا صفر ذخیره می‌شد
   // و قابلیت تا همیشه خاموش می‌موند)
   if(g_shotSince == 0 && TimeCurrent() > 0) g_shotSince = TimeCurrent();
   if(g_shotSince > 0) SaveShotState();
  }

// فایل‌های arion_shot_<ticket>_<kind>.png که قبل از ری‌استارت فرستاده نشده بودن دوباره صف می‌شن
void RestoreShotJobs()
  {
   string name;
   long fh = FileFindFirst("arion_shot_*.png", name);
   if(fh == INVALID_HANDLE) return;
   do
     {
      string core = StringSubstr(name, 11, StringLen(name) - 11 - 4);
      int us = -1;
      for(int i = StringLen(core) - 1; i >= 0; i--) if(StringGetCharacter(core, i) == '_') { us = i; break; }
      if(us <= 0) continue;
      string ticket = StringSubstr(core, 0, us);
      string kind = StringSubstr(core, us + 1);
      if(kind != "entry" && kind != "exit") continue;
      string key = ticket + ":" + kind;
      if(ShotDone(key) || HasShotJob(key)) { FileDelete(name); continue; }
      int n = ArraySize(g_jobTicket);
      ArrayResize(g_jobTicket, n + 1); ArrayResize(g_jobKind, n + 1); ArrayResize(g_jobFile, n + 1); ArrayResize(g_jobTries, n + 1);
      g_jobTicket[n] = ticket; g_jobKind[n] = kind; g_jobFile[n] = name; g_jobTries[n] = 0;
     }
   while(FileFindNext(fh, name));
   FileFindClose(fh);
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
              double sl, double tp, bool closed, string file, int width, int height)
  {
   SymbolSelect(symbol, true);
   // داده‌ی تایم‌فریم ممکنه هنوز دانلود نشده باشه — حداکثر 3 ثانیه صبر
   MqlRates r[];
   for(int k = 0; k < 30; k++)
     {
      if(CopyRates(symbol, ShotTimeframe, 0, 300, r) > 0) break;
      Sleep(100);
     }
   ResetLastError();
   long ch = ChartOpen(symbol, ShotTimeframe);
   if(ch == 0) { g_shotErr = "chart_open:" + symbol + ":" + IntegerToString(GetLastError()); return(false); }
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
   FileDelete(file);
   ResetLastError();
   bool ok = ChartScreenShot(ch, file, width, height, ALIGN_RIGHT);
   if(!ok)
     {
      // چارت تازه گاهی هنوز رسم نشده؛ یک تلاش دیگه بعد از رسم دوباره
      int e1 = GetLastError();
      ChartRedraw(ch);
      Sleep(800);
      ResetLastError();
      ok = ChartScreenShot(ch, file, width, height, ALIGN_RIGHT);
      if(!ok) g_shotErr = "screenshot:" + IntegerToString(e1) + "/" + IntegerToString(GetLastError());
     }
   // ذخیره‌ی فایل ممکنه کمی بعد تموم بشه؛ قبل از بستن چارت تا 3 ثانیه صبر
   for(int w = 0; ok && w < 30 && !FileIsExist(file); w++) Sleep(100);
   ChartClose(ch);
   if(ok && !FileIsExist(file)) { ok = false; g_shotErr = "file_missing:" + file; }
   return(ok);
  }

void QueueShot(string ticket, string kind, string symbol, datetime t1, double p1, datetime t2, double p2,
               bool buy, double sl, double tp, bool closed)
  {
   string key = ticket + ":" + kind;
   if(ShotDone(key) || HasShotJob(key)) return;
   string file = "arion_shot_" + ticket + "_" + kind + ".png";
   bool small = (StringFind(g_shotSmall, "|" + key + "|") >= 0);
   int w = small ? (int)MathMax(480, ShotWidth / 2) : ShotWidth;
   int h = small ? (int)MathMax(270, ShotHeight / 2) : ShotHeight;
   if(!TakeShot(symbol, t1, p1, t2, p2, buy, sl, tp, closed, file, w, h)) { Print("Arion: اسکرین ناموفق ", key, " ", g_shotErr); return; }
   int n = ArraySize(g_jobTicket);
   ArrayResize(g_jobTicket, n + 1); ArrayResize(g_jobKind, n + 1); ArrayResize(g_jobFile, n + 1); ArrayResize(g_jobTries, n + 1);
   g_jobTicket[n] = ticket; g_jobKind[n] = kind; g_jobFile[n] = file; g_jobTries[n] = 0;
  }

//| معاملات تازه‌ای که اسکرین ندارن → اسکرین (حداکثر 3 تا در هر بار)      |
void CaptureShots()
  {
   if(!SendScreenshots || g_token == "") return;
   if(g_shotSince == 0)
     {
      if(TimeCurrent() == 0) return;
      g_shotSince = TimeCurrent();
      SaveShotState();
     }
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
void DropShotJob(int i)
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

void UploadShots()
  {
   if(g_token == "") return;
   for(int i = ArraySize(g_jobTicket) - 1; i >= 0; i--)
     {
      string key = g_jobTicket[i] + ":" + g_jobKind[i];
      int h = FileOpen(g_jobFile[i], FILE_READ|FILE_BIN);
      if(h == INVALID_HANDLE)
        {
         g_shotErr = "file_open:" + IntegerToString(GetLastError());
         if(++g_jobTries[i] >= 5) DropShotJob(i); // فایل واقعا نیست → اسکرین دوباره گرفته می‌شه
         continue;
        }
      uchar data[], b64[], none[];
      int size = (int)FileReadArray(h, data);
      FileClose(h);
      if(size <= 0)
        {
         // فایل هنوز کامل نوشته نشده — دفعه‌ی بعد
         g_shotErr = "file_empty";
         if(++g_jobTries[i] >= 20) DropShotJob(i);
         continue;
        }
      if(CryptEncode(CRYPT_BASE64, data, none, b64) <= 0) { g_shotErr = "encode:" + IntegerToString(GetLastError()); DropShotJob(i); continue; }
      // base64 متاتریدر ممکنه خط‌شکن داشته باشه؛ خط‌شکن خام داخل رشته‌ی JSON نامعتبره
      string img = CharArrayToString(b64, 0, WHOLE_ARRAY, CP_ACP);
      StringReplace(img, "\r", "");
      StringReplace(img, "\n", "");
      string body = "{\"ticket\":\"" + g_jobTicket[i] + "\",\"kind\":\"" + g_jobKind[i] +
                    "\",\"image\":\"data:image/png;base64," + img + "\"}";
      int status;
      string res = HttpPost(ArionUrl + "/api/mt/screenshot",
                            "Content-Type: application/json\r\nAuthorization: Bearer " + g_token + "\r\n", body, status);
      if(status == 200)
        {
         MarkShotDone(key); DropShotJob(i);
         g_shotOk++; g_shotErr = "";
        }
      else if(status == 413 && StringFind(g_shotSmall, "|" + key + "|") < 0)
        {
         // حجم زیاد: این بار علامت «انجام‌شده» نمی‌خوره؛ CaptureShots با اندازه‌ی نصف دوباره می‌گیره
         g_shotSmall += key + "|";
         g_shotErr = "upload:413:" + IntegerToString(size);
         DropShotJob(i);
        }
      else if(status == 400 || status == 413)
        {
         // تکرار همین بدنه همون جواب رو می‌گیره؛ دلیل در پنل اتصال Arion ثبت می‌شه
         g_shotErr = "upload:" + IntegerToString(status) + ":" + JsonValue(res, "error");
         Print("Arion: سرور اسکرین ", key, " را رد کرد (", status, ") ", res);
         MarkShotDone(key); DropShotJob(i);
        }
      else if(status == 401) return;
      else
        {
         g_shotErr = (status == -1 ? "upload:-1:" + IntegerToString(g_httpErr) : "upload:" + IntegerToString(status));
         if(++g_jobTries[i] >= 20) DropShotJob(i); // خطای شبکه/سرور → بعدا دوباره
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

//+------------------------------------------------------------------+
//| ── مدیریت سرمایه ─────────────────────────────────────────────── |
//+------------------------------------------------------------------+
bool MmWanted() { return(EnableMoneyManagement && g_mmOn); }

// تایمر: بدون ثبت پیش‌فرض 15+ ثانیه؛ با قوانین فعال هر ثانیه (sync جدا با g_lastWork کنترل می‌شه)
void ApplyTimer()
  {
   EventKillTimer();
   if(g_token == "") EventSetTimer(RETRY_SECONDS);
   else EventSetTimer(MmWanted() ? 1 : MathMax(15, SyncSeconds));
  }

string MmFile(string kind) { return("arion_mm" + kind + "_" + IntegerToString(AccountNumber()) + ".txt"); }

void MmLog(string action, int ticket, string detail)
  {
   int n = ArraySize(g_evAct);
   if(n >= MM_EVENTS_MAX)
     {
      for(int i = 1; i < n; i++) { g_evT[i-1] = g_evT[i]; g_evAct[i-1] = g_evAct[i]; g_evTk[i-1] = g_evTk[i]; g_evDet[i-1] = g_evDet[i]; }
      n--;
     }
   ArrayResize(g_evT, n + 1); ArrayResize(g_evAct, n + 1); ArrayResize(g_evTk, n + 1); ArrayResize(g_evDet, n + 1);
   g_evT[n] = IntegerToString((int)TimeGMT());
   g_evAct[n] = action;
   g_evTk[n] = ticket > 0 ? IntegerToString(ticket) : "";
   g_evDet[n] = detail;
   Print("Arion MM: ", action, " ", g_evTk[n], " ", detail);
  }

void MmLogError(int ticket, string what)
  {
   // همان خطا برای یک پوزیشن هر ۶۰ ثانیه یک بار ثبت می‌شه
   string key = IntegerToString(ticket) + what;
   if(key == g_mmLastErr && TimeLocal() - g_mmLastErrAt < 60) return;
   g_mmLastErr = key; g_mmLastErrAt = TimeLocal();
   MmLog("error", ticket, what);
  }

// رویدادهای ثبت‌شده → آرایه‌ی JSON؛ count تعداد ارسالی (بعد از موفقیت sync حذفشان می‌کنیم)
string MmEventsJson(int &count)
  {
   count = ArraySize(g_evAct);
   if(count > 20) count = 20;
   string s = "[";
   for(int i = 0; i < count; i++)
     {
      if(i > 0) s += ",";
      s += "{\"t\":\"" + g_evT[i] + "\",\"action\":\"" + JsonEscape(g_evAct[i]) + "\",\"ticket\":\"" + JsonEscape(g_evTk[i]) +
           "\",\"detail\":\"" + JsonEscape(g_evDet[i]) + "\"}";
     }
   return(s + "]");
  }

void MmDropEvents(int count)
  {
   int n = ArraySize(g_evAct);
   if(count <= 0) return;
   if(count >= n) { ArrayResize(g_evT, 0); ArrayResize(g_evAct, 0); ArrayResize(g_evTk, 0); ArrayResize(g_evDet, 0); return; }
   for(int i = count; i < n; i++) { g_evT[i-count] = g_evT[i]; g_evAct[i-count] = g_evAct[i]; g_evTk[i-count] = g_evTk[i]; g_evDet[i-count] = g_evDet[i]; }
   int m = n - count;
   ArrayResize(g_evT, m); ArrayResize(g_evAct, m); ArrayResize(g_evTk, m); ArrayResize(g_evDet, m);
  }

//--- خواندن شیء ساده‌ی "mm":{...} از پاسخ سرور
string JsonObj(string json, string key)
  {
   string needle = "\"" + key + "\":{";
   int start = StringFind(json, needle);
   if(start < 0) return("");
   start += StringLen(needle);
   int end = StringFind(json, "}", start);
   if(end < 0) return("");
   return(StringSubstr(json, start, end - start));
  }

double JsonNum(string json, string key)
  {
   string needle = "\"" + key + "\":";
   int start = StringFind(json, needle);
   if(start < 0) return(0);
   start += StringLen(needle);
   int end = start;
   int n = StringLen(json);
   while(end < n)
     {
      ushort c = StringGetCharacter(json, end);
      if(c == ',' || c == '}') break;
      end++;
     }
   return(StringToDouble(StringSubstr(json, start, end - start)));
  }

void MmSaveRules()
  {
   int h = FileOpen(MmFile("rules"), FILE_WRITE|FILE_TXT);
   if(h == INVALID_HANDLE) return;
   string s = "0";
   if(g_mmOn)
      s = "1|" + DoubleToString(g_mmRiskPct, 2) + "|" + (g_mmReqSL ? "1" : "0") + "|" + DoubleToString(g_mmAutoSL, 2) +
          "|" + IntegerToString(g_mmGrace) + "|" + IntegerToString(g_mmMaxOpen) + "|" + IntegerToString(g_mmMaxDaily) +
          "|" + DoubleToString(g_mmMaxLoss, 2) + "|" + DoubleToString(g_mmTarget, 2) + "|" + (g_mmLockT ? "1" : "0") +
          "|" + DoubleToString(g_mmBeR, 2) + "|" + IntegerToString(g_mmBeOff) + "|" + DoubleToString(g_mmTrStart, 2) +
          "|" + DoubleToString(g_mmTrDist, 2);
   FileWriteString(h, s);
   FileClose(h);
  }

void MmLoadRules()
  {
   g_mmOn = false;
   int h = FileOpen(MmFile("rules"), FILE_READ|FILE_TXT);
   if(h == INVALID_HANDLE) return;
   string s = FileReadString(h);
   FileClose(h);
   string p[];
   if(StringSplit(s, '|', p) < 14 || p[0] != "1") return;
   g_mmRiskPct = StringToDouble(p[1]); g_mmReqSL = (p[2] == "1"); g_mmAutoSL = StringToDouble(p[3]);
   g_mmGrace = (int)StringToInteger(p[4]); g_mmMaxOpen = (int)StringToInteger(p[5]); g_mmMaxDaily = (int)StringToInteger(p[6]);
   g_mmMaxLoss = StringToDouble(p[7]); g_mmTarget = StringToDouble(p[8]); g_mmLockT = (p[9] == "1");
   g_mmBeR = StringToDouble(p[10]); g_mmBeOff = (int)StringToInteger(p[11]);
   g_mmTrStart = StringToDouble(p[12]); g_mmTrDist = StringToDouble(p[13]);
   g_mmOn = true;
  }

// پاسخ موفق sync: کلید mm نبود → قوانین خاموش (کاربر خاموشش کرده یا فلگ سرور بسته‌ست)
void MmApplyResponse(string res)
  {
   string o = JsonObj(res, "mm");
   bool was = g_mmOn;
   if(o == "")
     {
      if(g_mmOn) { g_mmOn = false; MmSaveRules(); }
     }
   else
     {
      g_mmRiskPct = JsonNum(o, "riskPct");     g_mmReqSL = (JsonNum(o, "requireSL") > 0.5);
      g_mmAutoSL = JsonNum(o, "autoSLPct");    g_mmGrace = (int)JsonNum(o, "slGraceSec");
      g_mmMaxOpen = (int)JsonNum(o, "maxOpen"); g_mmMaxDaily = (int)JsonNum(o, "maxDaily");
      g_mmMaxLoss = JsonNum(o, "maxLossPct");  g_mmTarget = JsonNum(o, "targetPct");
      g_mmLockT = (JsonNum(o, "lockOnTarget") > 0.5);
      g_mmBeR = JsonNum(o, "beR");             g_mmBeOff = (int)JsonNum(o, "beOffset");
      g_mmTrStart = JsonNum(o, "trailStartR"); g_mmTrDist = JsonNum(o, "trailDistR");
      if(g_mmGrace < 10) g_mmGrace = 10;
      g_mmOn = true;
      MmSaveRules();
     }
   if(was != g_mmOn && g_token != "") ApplyTimer();
  }

void MmSaveDay()
  {
   int h = FileOpen(MmFile("day"), FILE_WRITE|FILE_TXT);
   if(h == INVALID_HANDLE) return;
   FileWriteString(h, IntegerToString(g_mmDay) + "|" + DoubleToString(g_mmDayBal, 2) + "|" + IntegerToString(g_mmLock) +
                      "|" + IntegerToString(g_mmKilled));
   FileClose(h);
  }

void MmLoadDay()
  {
   int h = FileOpen(MmFile("day"), FILE_READ|FILE_TXT);
   if(h == INVALID_HANDLE) return;
   string s = FileReadString(h);
   FileClose(h);
   string p[];
   if(StringSplit(s, '|', p) < 4) return;
   if((int)StringToInteger(p[0]) != (int)(TimeCurrent() / 86400)) return;   // روز قدیمی
   g_mmDay = (int)StringToInteger(p[0]); g_mmDayBal = StringToDouble(p[1]);
   g_mmLock = (int)StringToInteger(p[2]); g_mmKilled = (int)StringToInteger(p[3]);
  }

// فاصله‌ی ریسک اولیه: ذخیره در حافظه + فایل تا با ری‌استارت گم نشه
void MmSaveDist()
  {
   int h = FileOpen(MmFile("dist"), FILE_WRITE|FILE_TXT);
   if(h == INVALID_HANDLE) return;
   string s = "";
   for(int i = 0; i < ArraySize(g_pId); i++) s += IntegerToString(g_pId[i]) + ":" + DoubleToString(g_pDist[i], 8) + ";";
   FileWriteString(h, s);
   FileClose(h);
  }

void MmLoadDist()
  {
   ArrayResize(g_pId, 0); ArrayResize(g_pDist, 0);
   int h = FileOpen(MmFile("dist"), FILE_READ|FILE_TXT);
   if(h == INVALID_HANDLE) return;
   string s = FileReadString(h);
   FileClose(h);
   string items[];
   int n = StringSplit(s, ';', items);
   for(int i = 0; i < n; i++)
     {
      string kv[];
      if(StringSplit(items[i], ':', kv) != 2) continue;
      int k = ArraySize(g_pId);
      ArrayResize(g_pId, k + 1); ArrayResize(g_pDist, k + 1);
      g_pId[k] = (int)StringToInteger(kv[0]); g_pDist[k] = StringToDouble(kv[1]);
     }
  }

double MmGetDist(int id)
  {
   for(int i = 0; i < ArraySize(g_pId); i++) if(g_pId[i] == id) return(g_pDist[i]);
   return(0);
  }

void MmSetDist(int id, double d)
  {
   for(int i = 0; i < ArraySize(g_pId); i++) if(g_pId[i] == id) return;
   int k = ArraySize(g_pId);
   ArrayResize(g_pId, k + 1); ArrayResize(g_pDist, k + 1);
   g_pId[k] = id; g_pDist[k] = d;
   MmSaveDist();
  }

bool MmInList(int v, int &list[])
  {
   for(int i = ArraySize(list) - 1; i >= 0; i--) if(list[i] == v) return(true);
   return(false);
  }

// تیکت‌هایی که دیگر باز نیستند از حافظه پاک می‌شن
void MmPrune(int &liveIds[])
  {
   bool changed = false;
   for(int i = ArraySize(g_pId) - 1; i >= 0; i--)
     {
      if(MmInList(g_pId[i], liveIds)) continue;
      for(int j = i; j < ArraySize(g_pId) - 1; j++) { g_pId[j] = g_pId[j+1]; g_pDist[j] = g_pDist[j+1]; }
      ArrayResize(g_pId, ArraySize(g_pId) - 1); ArrayResize(g_pDist, ArraySize(g_pDist) - 1);
      changed = true;
     }
   for(int i = ArraySize(g_nsId) - 1; i >= 0; i--)
     {
      if(MmInList(g_nsId[i], liveIds)) continue;
      for(int j = i; j < ArraySize(g_nsId) - 1; j++) { g_nsId[j] = g_nsId[j+1]; g_nsAt[j] = g_nsAt[j+1]; }
      ArrayResize(g_nsId, ArraySize(g_nsId) - 1); ArrayResize(g_nsAt, ArraySize(g_nsAt) - 1);
     }
   if(changed) MmSaveDist();
  }

datetime MmNoSlSince(int id)
  {
   for(int i = 0; i < ArraySize(g_nsId); i++) if(g_nsId[i] == id) return(g_nsAt[i]);
   int k = ArraySize(g_nsId);
   ArrayResize(g_nsId, k + 1); ArrayResize(g_nsAt, k + 1);
   g_nsId[k] = id; g_nsAt[k] = TimeLocal();
   return(g_nsAt[k]);
  }

void MmClearNoSl(int id)
  {
   for(int i = 0; i < ArraySize(g_nsId); i++)
      if(g_nsId[i] == id)
        {
         for(int j = i; j < ArraySize(g_nsId) - 1; j++) { g_nsId[j] = g_nsId[j+1]; g_nsAt[j] = g_nsAt[j+1]; }
         ArrayResize(g_nsId, ArraySize(g_nsId) - 1); ArrayResize(g_nsAt, ArraySize(g_nsAt) - 1);
         return;
        }
  }

//--- سفارش از پارشیال‌کلوز دیگری آمده؟ (کامنت «from #تیکت»)
bool MmIsRemainder(string comment) { return(StringFind(comment, "from #") == 0); }

//--- سود/ضرر بسته‌شده‌ی امروز (روز سرور) و تعداد پوزیشن‌های بازشده‌ی امروز.
//    تاریخچه فقط تا جایی که تب Account History ترمینال نشان می‌دهد در دسترسه.
void MmRefreshStats()
  {
   datetime dayStart = (datetime)((TimeCurrent() / 86400) * 86400);
   double closed = 0; int opened = 0;
   int old = 0;
   for(int i = OrdersHistoryTotal() - 1; i >= 0 && old < 300; i--)
     {
      if(!OrderSelect(i, SELECT_BY_POS, MODE_HISTORY)) continue;
      int ty = OrderType();
      if(ty != OP_BUY && ty != OP_SELL) continue;      // واریز/برداشت و... نه
      if(OrderCloseTime() < dayStart) { old++; continue; }
      old = 0;
      closed += OrderProfit() + OrderSwap() + OrderCommission();
      if(OrderOpenTime() >= dayStart && !MmIsRemainder(OrderComment())) opened++;
     }
   for(int i = OrdersTotal() - 1; i >= 0; i--)
     {
      if(!OrderSelect(i, SELECT_BY_POS, MODE_TRADES)) continue;
      int ty = OrderType();
      if(ty != OP_BUY && ty != OP_SELL) continue;
      if(OrderOpenTime() >= dayStart && !MmIsRemainder(OrderComment())) opened++;
     }
   g_mmClosed = closed; g_mmOpenedToday = opened; g_mmStatsAt = TimeLocal();
  }

//--- پول از دست رفته به ازای یک واحد حرکت قیمت برای حجم lots
double MmMoneyPerUnit(string sym, double lots)
  {
   double tv = MarketInfo(sym, MODE_TICKVALUE);
   double ts = MarketInfo(sym, MODE_TICKSIZE);
   if(tv <= 0 || ts <= 0) return(0);
   return(lots * tv / ts);
  }

// آیا SL پیشنهادی از نظر حداقل فاصله‌ی بروکر (stops level) معتبره؟
bool MmStopsOk(string sym, bool buy, double sl)
  {
   double pt = MarketInfo(sym, MODE_POINT);
   double minD = MathMax(MarketInfo(sym, MODE_STOPLEVEL), MarketInfo(sym, MODE_FREEZELEVEL)) * pt;
   if(buy) return(sl <= MarketInfo(sym, MODE_BID) - minD);
   return(sl >= MarketInfo(sym, MODE_ASK) + minD);
  }

// بستن (کامل یا بخشی). lots<=0 یعنی کل پوزیشن.
bool MmClose(int ticket, double lots, string action, string detail)
  {
   if(!OrderSelect(ticket, SELECT_BY_TICKET) || OrderCloseTime() != 0) return(false);
   string sym = OrderSymbol();
   bool buy = (OrderType() == OP_BUY);
   if(lots <= 0 || lots > OrderLots()) lots = OrderLots();
   RefreshRates();
   double px = buy ? MarketInfo(sym, MODE_BID) : MarketInfo(sym, MODE_ASK);
   ResetLastError();
   if(OrderClose(ticket, lots, px, 50, clrNONE))
     {
      MmLog(action, ticket, detail);
      return(true);
     }
   MmLogError(ticket, "close failed err=" + IntegerToString(GetLastError()));
   return(false);
  }

bool MmModifySL(int ticket, double sl, string action, string detail)
  {
   if(!OrderSelect(ticket, SELECT_BY_TICKET) || OrderCloseTime() != 0) return(false);
   sl = NormalizeDouble(sl, (int)MarketInfo(OrderSymbol(), MODE_DIGITS));
   ResetLastError();
   if(OrderModify(ticket, OrderOpenPrice(), sl, OrderTakeProfit(), 0, clrNONE))
     {
      if(action != "") MmLog(action, ticket, detail);
      return(true);
     }
   MmLogError(ticket, "modify failed err=" + IntegerToString(GetLastError()));
   return(false);
  }

// بعد از پارشیال‌کلوز، باقیمانده تیکت تازه با کامنت «from #قدیمی» می‌گیره؛ R اولیه منتقل می‌شه
void MmMoveDist(int oldTicket, string sym)
  {
   double d = MmGetDist(oldTicket);
   if(d <= 0) return;
   string tag = "from #" + IntegerToString(oldTicket);
   for(int i = OrdersTotal() - 1; i >= 0; i--)
     {
      if(!OrderSelect(i, SELECT_BY_POS, MODE_TRADES)) continue;
      if(OrderSymbol() != sym) continue;
      if(StringFind(OrderComment(), tag) == 0) { MmSetDist(OrderTicket(), d); return; }
     }
  }

//+------------------------------------------------------------------+
//| اجرای قوانین روی پوزیشن‌های این حساب (حداکثر هر ثانیه یک بار)      |
//+------------------------------------------------------------------+
void MmRun(bool force = false)
  {
   if(!MmWanted()) return;
   uint nowMs = (uint)GetTickCount();
   if(!force && nowMs - g_mmLastRun < 1000) return;
   g_mmLastRun = nowMs;
   if(!IsTradeAllowed())
     {
      MmLogError(0, "trading not allowed (AutoTrading off or context busy)");
      return;
     }

   // روز سرور جدید → ریست؛ بالانس شروع روز = بالانس فعلی منهای سود بسته‌شده‌ی امروز
   int dayKey = (int)(TimeCurrent() / 86400);
   datetime dayStart = (datetime)(dayKey * 86400);
   int total = OrdersTotal();
   if(dayKey != g_mmDay)
     {
      MmRefreshStats();
      g_mmDay = dayKey;
      g_mmDayBal = AccountBalance() - g_mmClosed;
      g_mmLock = 0; g_mmKilled = 0;
      MmSaveDay();
     }
   else if(total != g_mmLastCnt || TimeLocal() - g_mmStatsAt >= 3) MmRefreshStats();
   g_mmLastCnt = total;

   // پوزیشن‌های بازار به ترتیب زمان باز شدن (قدیمی اول)
   int tk[]; datetime tm[]; bool gone[];
   int cnt = 0;
   double floating = 0;
   for(int i = 0; i < total; i++)
     {
      if(!OrderSelect(i, SELECT_BY_POS, MODE_TRADES)) continue;
      if(OrderType() != OP_BUY && OrderType() != OP_SELL) continue;
      ArrayResize(tk, cnt + 1); ArrayResize(tm, cnt + 1); ArrayResize(gone, cnt + 1);
      tk[cnt] = OrderTicket(); tm[cnt] = OrderOpenTime(); gone[cnt] = false;
      floating += OrderProfit() + OrderSwap() + OrderCommission();
      cnt++;
     }
   for(int a = 1; a < cnt; a++)
     {
      int kt = tk[a]; datetime km = tm[a]; int b = a - 1;
      while(b >= 0 && tm[b] > km) { tk[b+1] = tk[b]; tm[b+1] = tm[b]; b--; }
      tk[b+1] = kt; tm[b+1] = km;
     }
   MmPrune(tk);

   // قفل ضرر / هدف سود روزانه
   if(g_mmLock == 0 && g_mmDayBal > 0)
     {
      double pnl = g_mmClosed + floating;
      if(g_mmMaxLoss > 0 && pnl <= -g_mmMaxLoss / 100.0 * g_mmDayBal)
        {
         g_mmLock = 1; MmSaveDay();
         MmLog("lock_loss", 0, "day pnl " + DoubleToString(pnl, 2) + " limit -" + DoubleToString(g_mmMaxLoss, 2) + "%");
        }
      else if(g_mmTarget > 0 && g_mmLockT && pnl >= g_mmTarget / 100.0 * g_mmDayBal)
        {
         g_mmLock = 2; MmSaveDay();
         MmLog("lock_target", 0, "day pnl " + DoubleToString(pnl, 2) + " target " + DoubleToString(g_mmTarget, 2) + "%");
        }
     }
   if(g_mmLock > 0)
     {
      for(int i = cnt - 1; i >= 0; i--) MmClose(tk[i], 0, "close_locked", g_mmLock == 1 ? "daily loss lock" : "daily target lock");
      return;
     }

   // سقف تعداد پوزیشن باز: جدیدترین‌ها اول بسته می‌شن
   if(g_mmMaxOpen > 0)
     {
      int live = cnt;
      for(int i = cnt - 1; i >= 0 && live > g_mmMaxOpen; i--)
         if(MmClose(tk[i], 0, "close_maxopen", "max open " + IntegerToString(g_mmMaxOpen))) { gone[i] = true; live--; }
     }
   // سقف تعداد معامله‌ی روزانه
   if(g_mmMaxDaily > 0)
     {
      int excess = (g_mmOpenedToday - g_mmKilled) - g_mmMaxDaily;
      for(int i = cnt - 1; i >= 0 && excess > 0; i--)
        {
         if(gone[i] || tm[i] < dayStart) continue;
         if(OrderSelect(tk[i], SELECT_BY_TICKET) && MmIsRemainder(OrderComment())) continue;
         if(MmClose(tk[i], 0, "close_maxdaily", "max daily " + IntegerToString(g_mmMaxDaily)))
           { gone[i] = true; excess--; g_mmKilled++; MmSaveDay(); }
        }
     }

   double balance = AccountBalance();
   for(int i = 0; i < cnt; i++)
     {
      if(gone[i]) continue;
      int t = tk[i];
      if(!OrderSelect(t, SELECT_BY_TICKET) || OrderCloseTime() != 0) continue;
      string sym = OrderSymbol();
      bool buy = (OrderType() == OP_BUY);
      double vol = OrderLots();
      double open = OrderOpenPrice();
      double sl = OrderStopLoss();
      double pt = MarketInfo(sym, MODE_POINT);
      int digits = (int)MarketInfo(sym, MODE_DIGITS);
      if(pt <= 0) continue;

      // 1) حد ضرر اجباری
      if(sl <= 0 && g_mmReqSL)
        {
         bool fixedSl = false;
         double perUnit = MmMoneyPerUnit(sym, vol);
         if(g_mmAutoSL > 0 && perUnit > 0 && balance > 0)
           {
            double d1 = (balance * g_mmAutoSL / 100.0) / perUnit;
            double minD = (MathMax(MarketInfo(sym, MODE_STOPLEVEL), MarketInfo(sym, MODE_FREEZELEVEL)) + 2) * pt;
            double px = buy ? MarketInfo(sym, MODE_BID) : MarketInfo(sym, MODE_ASK);
            double slPx = buy ? open - d1 : open + d1;
            // نزدیک‌تر از حداقل فاصله‌ی بروکر مجاز نیست؛ ریسک هر معامله بعدش حجم رو تنظیم می‌کنه
            if(buy && slPx > px - minD) slPx = px - minD;
            if(!buy && slPx < px + minD) slPx = px + minD;
            slPx = NormalizeDouble(slPx, digits);
            if(slPx > 0 && MmModifySL(t, slPx, "sl_set", "auto SL " + DoubleToString(slPx, digits) + " risk " + DoubleToString(g_mmAutoSL, 2) + "%"))
              { fixedSl = true; sl = slPx; }
           }
         if(!fixedSl)
           {
            datetime since = MmNoSlSince(t);
            if(TimeLocal() - since >= g_mmGrace)
               MmClose(t, 0, "close_nosl", "no SL after " + IntegerToString(g_mmGrace) + "s");
            continue;   // بدون SL قانون‌های ریسک/BE/تریلینگ معنی ندارن
           }
        }
      if(!OrderSelect(t, SELECT_BY_TICKET) || OrderCloseTime() != 0) continue;
      sl = OrderStopLoss();
      if(sl > 0) MmClearNoSl(t);
      if(sl <= 0) continue;

      // فاصله‌ی ریسک اولیه (SL سمت ضرر) — پایه‌ی محاسبه‌ی R
      if(MmGetDist(t) <= 0)
        {
         double d0 = buy ? open - sl : sl - open;
         if(d0 > 0) MmSetDist(t, d0);
        }

      // 2) ریسک هر معامله: حجم اضافه بسته می‌شه
      if(g_mmRiskPct > 0 && balance > 0)
        {
         double riskDist = buy ? open - sl : sl - open;       // منفی یعنی SL روی سود
         double perUnit = MmMoneyPerUnit(sym, vol);
         double risk = riskDist > 0 ? riskDist * perUnit : 0;
         double limit = balance * g_mmRiskPct / 100.0;
         if(risk > limit * 1.02 && perUnit > 0)
           {
            double step = MarketInfo(sym, MODE_LOTSTEP);
            double minV = MarketInfo(sym, MODE_MINLOT);
            if(step <= 0) step = minV;
            double newVol = MathFloor(vol * limit / risk / step + 1e-9) * step;
            if(newVol < minV)
              {
               if(MmClose(t, 0, "close_risk", "risk " + DoubleToString(risk, 2) + " > limit " + DoubleToString(limit, 2))) continue;
              }
            else
              {
               double cv = NormalizeDouble(vol - newVol, 8);
               if(cv >= minV)
                 {
                  if(MmClose(t, cv, "partial_risk", "closed " + DoubleToString(cv, 2) + " lot, left " + DoubleToString(newVol, 2) + ", limit " + DoubleToString(limit, 2)))
                    {
                     MmMoveDist(t, sym);   // باقیمانده تیکت تازه داره
                     continue;             // BE/تریلینگ در اجرای بعدی
                    }
                 }
              }
           }
        }

      // 3) سر به سر و 4) تریلینگ — بر پایه‌ی R
      double dist = MmGetDist(t);
      if(dist <= 0) continue;
      if(!OrderSelect(t, SELECT_BY_TICKET) || OrderCloseTime() != 0) continue;
      sl = OrderStopLoss();
      double cur = buy ? MarketInfo(sym, MODE_BID) : MarketInfo(sym, MODE_ASK);
      double prof = buy ? cur - open : open - cur;
      if(g_mmBeR > 0 && prof >= g_mmBeR * dist)
        {
         double target = NormalizeDouble(buy ? open + g_mmBeOff * pt : open - g_mmBeOff * pt, digits);
         bool need = buy ? (sl < target - pt * 0.5) : (sl > target + pt * 0.5);
         if(need && MmStopsOk(sym, buy, target))
           {
            if(MmModifySL(t, target, "breakeven", "SL to " + DoubleToString(target, digits))) sl = target;
           }
        }
      if(g_mmTrStart > 0 && g_mmTrDist > 0 && prof >= g_mmTrStart * dist)
        {
         double nsl = NormalizeDouble(buy ? cur - g_mmTrDist * dist : cur + g_mmTrDist * dist, digits);
         double minGain = MathMax(pt * 5, 0.05 * dist);
         bool better = buy ? (nsl > sl + minGain) : (sl <= 0 || nsl < sl - minGain);
         if(better && MmStopsOk(sym, buy, nsl))
           {
            bool first = (StringFind(g_trailLogged, "|" + IntegerToString(t) + "|") < 0);
            if(MmModifySL(t, nsl, first ? "trail" : "", "SL to " + DoubleToString(nsl, digits)) && first)
               g_trailLogged += IntegerToString(t) + "|";
           }
        }
     }
  }

string MmStatusLine()
  {
   if(!EnableMoneyManagement) return("مدیریت سرمایه: خاموش (ورودی اکسپرت)");
   if(!g_mmOn) return("مدیریت سرمایه: غیرفعال");
   string s = "مدیریت سرمایه: فعال";
   if(g_mmLock == 1) s += " — قفل ضرر روزانه";
   else if(g_mmLock == 2) s += " — قفل هدف سود روزانه";
   return(s);
  }
