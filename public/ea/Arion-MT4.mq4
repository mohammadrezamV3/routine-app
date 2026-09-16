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
#property version   "1.10"
#property strict

input string ArionUrl     = "https://arionapp.ir"; // آدرس سایت Arion
input string PairingCode  = "";                     // کد اتصال (فقط بار اول)
input int    SyncSeconds  = 60;                     // فاصله‌ی ارسال، به ثانیه

// توکن بعد از اولین اتصال موفق روی همین ترمینال ذخیره می‌شود تا کد اتصال
// دیگر لازم نباشد. شماره‌ی حساب کنارش ذخیره می‌شود تا توکنِ حسابِ دیگری
// اشتباهی روی این حساب استفاده نشود.
string   g_token      = "";
datetime g_lastSync   = 0;
string   g_status     = "در حال راه‌اندازی…";
int      g_failCount  = 0;
string   g_tokenFile  = "arion_token.txt";

// تا وقتی وصل نشده‌ایم زود‌به‌زود تلاش می‌کنیم (نه با فاصله‌ی ارسالِ کامل)،
// چون معمولا کاربر همین چند دقیقه‌ی اول دارد تنظیمات را درست می‌کند.
#define RETRY_SECONDS 10

//+------------------------------------------------------------------+
int OnInit()
  {
   g_token = LoadToken();
   // تلاشِ اول همین‌جا، ولی *شکستش پایان کار نیست* — تایمر باز هم تلاش
   // می‌کند. باگِ نسخه‌ی قبلی همین بود: اگر این یک تلاش شکست می‌خورد
   // (WebRequest هنوز اجازه نداشت، یا کاربر کد را بعدا می‌گذاشت) اکسپرت
   // تا حذف و نصبِ دوباره برای همیشه «غیرفعال» می‌ماند.
   if(g_token == "") Pair();
   EventSetTimer(g_token == "" ? RETRY_SECONDS : MathMax(15, SyncSeconds));
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
   else Sync();
   ShowStatus();
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
//| ذخیره و خواندن توکن (به‌همراه شماره‌ی حساب)                        |
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
   status = WebRequest("POST", url, headers, 10000, post, result, resultHeaders);
   if(status == -1)
     {
      int err = GetLastError();
      g_status = "WebRequest اجازه ندارد (خطای " + IntegerToString(err) +
                 ") — آدرس «" + ArionUrl + "» را در Tools → Options → Expert Advisors اضافه کنید";
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
   return((int)((TimeCurrent() - TimeGMT()) / 60));
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
   g_status = "اتصال برقرار شد";
   Print("Arion: اتصال برقرار شد");
  }

//+------------------------------------------------------------------+
//| ارسال معاملات                                                    |
//+------------------------------------------------------------------+
void Sync()
  {
   string trades = "";
   int count = 0;

   // معاملات باز
   for(int i = 0; i < OrdersTotal(); i++)
     {
      if(!OrderSelect(i, SELECT_BY_POS, MODE_TRADES)) continue;
      if(OrderType() > OP_SELL) continue; // فقط خرید/فروش، نه سفارش‌های در انتظار
      if(count > 0) trades += ",";
      trades += TradeJson(false);
      count++;
     }

   // معاملات بسته‌ی اخیر (حداکثر ۲۰۰ تای آخر)
   int total = OrdersHistoryTotal();
   int from  = MathMax(0, total - 200);
   for(int j = from; j < total; j++)
     {
      if(!OrderSelect(j, SELECT_BY_POS, MODE_HISTORY)) continue;
      if(OrderType() > OP_SELL) continue;
      if(count > 0) trades += ",";
      trades += TradeJson(true);
      count++;
     }

   string body = StringFormat(
      "{\"balance\":%.2f,\"equity\":%.2f,\"currency\":\"%s\",\"tzOffsetMinutes\":%d,\"trades\":[%s]}",
      AccountBalance(), AccountEquity(), JsonEscape(AccountCurrency()),
      BrokerTzOffsetMinutes(), trades);

   int status;
   string res = HttpPost(ArionUrl + "/api/mt/sync",
                         "Content-Type: application/json\r\nAuthorization: Bearer " + g_token + "\r\n",
                         body, status);

   if(status == -1) return;
   if(status == 401)
     {
      // توکن باطل شده (کاربر از پنل ابطالش کرده یا کد جدید گرفته)
      g_token = "";
      SaveToken("");
      g_status = "توکن باطل شده — از Arion کد اتصال جدید بگیرید";
      Print("Arion: ", g_status);
      EventKillTimer();
      EventSetTimer(RETRY_SECONDS);
      return;
     }
   if(status != 200)
     {
      g_failCount++;
      g_status = "ارسال ناموفق (کد " + IntegerToString(status) + ")";
      Print("Arion: ", g_status, " ", res);
      return;
     }

   g_failCount = 0;
   g_lastSync = TimeCurrent();
   g_status = "ارسال شد: " + IntegerToString(count) + " معامله";
  }

//+------------------------------------------------------------------+
//| JSON یک معامله‌ی انتخاب‌شده                                       |
//+------------------------------------------------------------------+
string TradeJson(bool closed)
  {
   return(StringFormat(
      "{\"ticket\":\"%d\",\"symbol\":\"%s\",\"type\":\"%s\",\"volume\":%.2f,"
      "\"openPrice\":%.5f,\"closePrice\":%.5f,\"stopLoss\":%.5f,\"takeProfit\":%.5f,"
      "\"profit\":%.2f,\"commission\":%.2f,\"swap\":%.2f,"
      "\"openTime\":%d,\"closeTime\":%d,\"closed\":%s}",
      OrderTicket(), JsonEscape(OrderSymbol()), (OrderType() == OP_BUY ? "BUY" : "SELL"), OrderLots(),
      OrderOpenPrice(), OrderClosePrice(), OrderStopLoss(), OrderTakeProfit(),
      OrderProfit(), OrderCommission(), OrderSwap(),
      (int)OrderOpenTime(), (int)OrderCloseTime(), (closed ? "true" : "false")));
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
//+------------------------------------------------------------------+
