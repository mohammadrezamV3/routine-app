//+------------------------------------------------------------------+
//|                                                     Arion-MT5.mq5 |
//|            اکسپرت اتصال حساب متاتریدر ۵ به ژورنال ترید Arion       |
//+------------------------------------------------------------------+
//
// این اکسپرت فقط اطلاعات معاملات را می‌خواند و به Arion می‌فرستد.
// هیچ سفارشی باز یا بسته نمی‌کند و هیچ دستوری از سرور نمی‌گیرد.
// رمز حساب معاملاتی شما هیچ‌جا استفاده یا ذخیره نمی‌شود.
//
// نصب:
//   ۱) این فایل را در پوشه‌ی MQL5/Experts ترمینال بگذارید
//   ۲) در MetaEditor بازش کنید و F7 بزنید تا کامپایل شود
//   ۳) در متاتریدر: Tools → Options → Expert Advisors →
//      «Allow WebRequest for listed URL» را تیک بزنید و آدرس سایت Arion را
//      اضافه کنید. (متاتریدر بدون این اجازه هیچ درخواستی نمی‌فرستد.)
//   ۴) اکسپرت را روی یک چارت بیندازید و «کد اتصال» را که در Arion گرفته‌اید
//      در فیلد PairingCode بگذارید
//
#property copyright "Arion"
#property link      "https://arionapp.ir"
#property version   "1.30"
#property strict

input string ArionUrl    = "https://arionapp.ir"; // آدرس سایت Arion
input string PairingCode = "";                     // کد اتصال (فقط بار اول)
input int    SyncSeconds = 60;                     // فاصله‌ی ارسال، به ثانیه

// حداکثر تعداد معامله در هر درخواست — تاریخچه‌ی طولانی توی چند درخواستِ
// پشتِ‌سرهم چانک می‌شه. کوچک‌تر از قبل (۳۰۰) تا هر درخواست زیرِ timeout بمونه.
#define MT_CHUNK_SIZE 200
// timeoutِ WebRequest (میلی‌ثانیه). ۱۰ ثانیه برای دسته‌ی بزرگِ بک‌فیل کم بود و
// درخواست با خطای ۵۲۰۳ قطع می‌شد — یعنی آن دسته و همه‌ی بعدی‌ها هرگز نمی‌رسید.
#define HTTP_TIMEOUT_MS 30000
// هر سینکِ افزایشی این مقدار (ثانیه) به عقب هم نگاه می‌کند. معامله‌ای که در
// همان ثانیه‌ی کِرسر یا کمی قبلش بسته شده ولی دیرتر در تاریخچه ظاهر شده، دیگر
// جا نمی‌ماند؛ ارسالِ تکراری بی‌خطر است (سرور با شناسه‌ی پوزیشن ضدتکرار است).
#define CURSOR_OVERLAP 3600

string   g_token     = "";
datetime g_lastSync  = 0;
string   g_status    = "در حال راه‌اندازی…";
int      g_failCount = 0;
string   g_tokenFile = "arion_token.txt";
int      g_tzMinutes = 0;
bool     g_tzKnown   = false;

// زمانِ آخرین dealی که با موفقیت فرستاده شده + تعدادِ کلِ dealهای تاریخچه
// در آن لحظه. اگر تعدادِ کل بیشتر از dealهای تازه‌ی بعد از کِرسر زیاد شد،
// یعنی تاریخچه‌ی قدیمی‌تری تازه لود شده (مثلا EA لحظه‌ی باز شدنِ ترمینال،
// قبل از دانلودِ کاملِ تاریخچه، اجرا شده بود) → کلِ تاریخچه دوباره فرستاده
// می‌شود. قبلا کِرسر همان اول روی آخرین معامله می‌پرید و بقیه‌ی تاریخچه
// هرگز فرستاده نمی‌شد (ریشه‌ی «فقط ۲ تا از ۱۰ معامله رسید»).
datetime g_cursorTime = 0;
long     g_knownTotal = 0;
string   g_cursorFile = "arion_cursor_v13.txt";
// نسخه‌ی 1.30: فایل کرسر جدید تا اولین اجرا بعد از آپدیت یک‌بار کل تاریخچه (همراه
// واریز/برداشت و هزینه‌هایی که نسخه‌های قبل نمی‌فرستادن) دوباره فرستاده بشه.

#define RETRY_SECONDS 10

//+------------------------------------------------------------------+
int OnInit()
  {
   g_token = LoadToken();
   LoadCursor();
   if(g_token == "") Pair();
   EventSetTimer(g_token == "" ? RETRY_SECONDS : (int)MathMax(15, SyncSeconds));
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
      if(g_token != "")
        {
         EventKillTimer();
         EventSetTimer((int)MathMax(15, SyncSeconds));
         Sync();
        }
     }
   else Sync();
   ShowStatus();
  }

//+------------------------------------------------------------------+
void ShowStatus()
  {
   string line2 = (g_lastSync > 0 ? "آخرین ارسال: " + TimeToString(g_lastSync, TIME_MINUTES|TIME_SECONDS)
                                  : "هنوز چیزی ارسال نشده");
   Comment("Arion — ", (g_token == "" ? "متصل نیست" : "متصل"), "\n",
           g_status, "\n", line2);
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
//| عدد → JSON. NaN/Inf در JSON معتبر نیست و قبلا کلِ دسته را ۴۰۰ می‌کرد  |
//| (یعنی یک معامله‌ی عجیب همه‌ی معاملاتِ همان دسته را می‌انداخت).       |
//+------------------------------------------------------------------+
string Num(double v, int digits)
  {
   if(!MathIsValidNumber(v)) return("null");
   return(DoubleToString(v, digits));
  }

//+------------------------------------------------------------------+
//| اختلافِ ساعتِ سرورِ بروکر با UTC، به دقیقه                          |
//+------------------------------------------------------------------+
int BrokerTzOffsetMinutes()
  {
   // TimeTradeServer() برخلافِ TimeCurrent() (زمانِ آخرین تیک) آخرِ هفته و
   // روی بازارِ بسته هم درست است. به نزدیک‌ترین ۱۵ دقیقه گرد می‌شود.
   long diff = (long)(TimeTradeServer() - TimeGMT());
   int mins = (int)(MathRound(diff / 900.0) * 15);
   if(MathAbs(mins) <= 14 * 60) { g_tzMinutes = mins; g_tzKnown = true; }
   return(g_tzMinutes);
  }

//+------------------------------------------------------------------+
string LoadToken()
  {
   int h = FileOpen(g_tokenFile, FILE_READ|FILE_TXT|FILE_ANSI);
   if(h == INVALID_HANDLE) return("");
   string line = FileReadString(h);
   FileClose(h);

   int sep = StringFind(line, "|");
   if(sep < 0) return("");          // فرمتِ قدیمی/ناقص — نادیده
   string tok = StringSubstr(line, 0, sep);
   string acc = StringSubstr(line, sep + 1);
   if(acc != IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN)))
     {
      g_status = "توکنِ ذخیره‌شده برای حسابِ دیگری‌ست — کد اتصالِ جدید بگذارید";
      return("");
     }
   return(tok);
  }

void SaveToken(string token)
  {
   int h = FileOpen(g_tokenFile, FILE_WRITE|FILE_TXT|FILE_ANSI);
   if(h == INVALID_HANDLE) { Print("Arion: نوشتن توکن ناموفق"); return; }
   FileWriteString(h, token == "" ? "" : token + "|" + IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN)));
   FileClose(h);
  }

// فرمت: «cursor|knownTotal|login». فایلِ نسخه‌ی قبل فقط cursor داشت →
// knownTotal=0 → یک‌بار کلِ تاریخچه دوباره فرستاده می‌شود (عمدا). کِرسرِ یک
// حسابِ دیگر هم نادیده گرفته می‌شود.
void LoadCursor()
  {
   g_cursorTime = 0; g_knownTotal = 0;
   int h = FileOpen(g_cursorFile, FILE_READ|FILE_TXT|FILE_ANSI);
   if(h == INVALID_HANDLE) return;
   string s = FileReadString(h);
   FileClose(h);
   string parts[];
   if(StringSplit(s, '|', parts) < 3) return;
   if(parts[2] != IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN))) return;
   g_cursorTime = (datetime)StringToInteger(parts[0]);
   g_knownTotal = StringToInteger(parts[1]);
  }

void SaveCursor()
  {
   int h = FileOpen(g_cursorFile, FILE_WRITE|FILE_TXT|FILE_ANSI);
   if(h == INVALID_HANDLE) return;
   FileWriteString(h, IntegerToString((long)g_cursorTime) + "|" + IntegerToString(g_knownTotal) +
                      "|" + IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN)));
   FileClose(h);
  }

//+------------------------------------------------------------------+
string HttpPost(string url, string headers, string body, int &status)
  {
   char post[], result[];
   string resultHeaders;
   // اندازه‌ی واقعیِ آرایه‌ی بایت‌های UTF-8 ملاک است، نه StringLen
   int len = StringToCharArray(body, post, 0, WHOLE_ARRAY, CP_UTF8) - 1;
   if(len < 0) len = 0;
   ArrayResize(post, len);
   ResetLastError();
   status = WebRequest("POST", url, headers, HTTP_TIMEOUT_MS, post, result, resultHeaders);
   if(status == -1)
     {
      int err = GetLastError();
      if(err == 4014)
         g_status = "WebRequest اجازه ندارد — آدرس «" + ArionUrl + "» را در Tools → Options → Expert Advisors اضافه کنید";
      else
         g_status = "ارتباط با سرور ناموفق (خطای " + IntegerToString(err) + ") — دوباره تلاش می‌شود";
      Print("Arion: ", g_status);
      return("");
     }
   return(CharArrayToString(result, 0, WHOLE_ARRAY, CP_UTF8));
  }

//+------------------------------------------------------------------+
void Pair()
  {
   if(PairingCode == "")
     {
      g_status = "کد اتصال وارد نشده — از Arion کد بگیرید و در PairingCode بگذارید";
      return;
     }

   string body = StringFormat(
      "{\"code\":\"%s\",\"platform\":\"MT5\",\"accountLogin\":\"%I64d\",\"server\":\"%s\",\"broker\":\"%s\"}",
      JsonEscape(PairingCode), AccountInfoInteger(ACCOUNT_LOGIN),
      JsonEscape(AccountInfoString(ACCOUNT_SERVER)), JsonEscape(AccountInfoString(ACCOUNT_COMPANY)));

   int status;
   string res = HttpPost(ArionUrl + "/api/mt/pair", "Content-Type: application/json\r\n", body, status);
   if(status == -1) return;
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
   string body = "{\"balance\":" + Num(AccountInfoDouble(ACCOUNT_BALANCE), 2) +
                 ",\"equity\":" + Num(AccountInfoDouble(ACCOUNT_EQUITY), 2) +
                 ",\"currency\":\"" + JsonEscape(AccountInfoString(ACCOUNT_CURRENCY)) + "\"" +
                 ",\"eaVersion\":\"1.30\"";
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

   long skipped = JsonInt(res, "skipped");
   long failed  = JsonInt(res, "failed");
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
//| جمع‌بندیِ یک پوزیشن از روی همه‌ی dealهایش.                           |
//| - کمیسیون/سواپ/سود روی همه‌ی dealها (ورود + همه‌ی خروج‌ها) جمع می‌شود؛ |
//|   بعضی بروکرها کمیسیون را روی dealِ ورود می‌زنند.                     |
//| - partial close: همه‌ی خروج‌ها یک DEAL_POSITION_ID دارند و در Arion یک   |
//|   ردیف‌اند. قبلا فقط آخرین خروج (حجم/سودِ همان تکه) فرستاده می‌شد و     |
//|   سودِ تکه‌های قبلی گم می‌شد؛ حالا جمعِ همه با قیمتِ خروجِ میانگین.      |
//| - زمان/قیمتِ ورود و SL/TP از dealِ ورود؛ قبلا برای معامله‌ی بسته اصلا    |
//|   فرستاده نمی‌شد و openTime همان زمانِ بستن بود.                       |
//| HistorySelectByPosition انتخابِ تاریخچه را عوض می‌کند، پس فقط بعد از    |
//| جمع‌کردنِ شناسه‌ها صدا زده می‌شود.                                     |
//+------------------------------------------------------------------+
string PositionJson(long posId, bool closed, string openSymbol, double openVolume,
                    double openSl, double openTp, double floating)
  {
   double commission = 0, swap = 0, profit = 0;
   double inVol = 0, inPx = 0, outVol = 0, outPx = 0, sl = 0, tp = 0;
   datetime openTime = 0, closeTime = 0;
   string symbol = openSymbol;
   long dir = -1;

   if(HistorySelectByPosition(posId))
     {
      int n = HistoryDealsTotal();
      for(int i = 0; i < n; i++)
        {
         ulong d = HistoryDealGetTicket(i);
         if(d == 0) continue;
         long type = HistoryDealGetInteger(d, DEAL_TYPE);
         long entry = HistoryDealGetInteger(d, DEAL_ENTRY);
         double vol = HistoryDealGetDouble(d, DEAL_VOLUME);
         double px  = HistoryDealGetDouble(d, DEAL_PRICE);
         datetime t = (datetime)HistoryDealGetInteger(d, DEAL_TIME);
         // DEAL_FEE: کارمزدی که بعضی بروکرها جدا از کمیسیون ثبت می‌کنن — قبلا جا می‌موند
         commission += HistoryDealGetDouble(d, DEAL_COMMISSION) + HistoryDealGetDouble(d, DEAL_FEE);
         swap       += HistoryDealGetDouble(d, DEAL_SWAP);
         profit     += HistoryDealGetDouble(d, DEAL_PROFIT);
         if(type != DEAL_TYPE_BUY && type != DEAL_TYPE_SELL) continue;
         if(symbol == "") symbol = HistoryDealGetString(d, DEAL_SYMBOL);
         if(entry == DEAL_ENTRY_IN)
           {
            if(dir < 0) dir = type;
            if(openTime == 0 || t < openTime) openTime = t;
            inPx += px * vol; inVol += vol;
            if(sl == 0) sl = HistoryDealGetDouble(d, DEAL_SL);
            if(tp == 0) tp = HistoryDealGetDouble(d, DEAL_TP);
           }
         else // OUT، OUT_BY (close by) و INOUT (برگشتِ پوزیشن در حسابِ netting)
           {
            if(dir < 0) dir = (type == DEAL_TYPE_SELL ? DEAL_TYPE_BUY : DEAL_TYPE_SELL);
            if(t > closeTime) closeTime = t;
            outPx += px * vol; outVol += vol;
            if(sl == 0) sl = HistoryDealGetDouble(d, DEAL_SL);
            if(tp == 0) tp = HistoryDealGetDouble(d, DEAL_TP);
           }
        }
     }

   if(!closed)
     {
      // پوزیشنِ باز: سودِ شناور + سودِ تکه‌های partial-close تا این لحظه
      profit = floating + profit;
      if(openSl > 0) sl = openSl;
      if(openTp > 0) tp = openTp;
     }
   if(symbol == "" || (openTime == 0 && closeTime == 0)) return("");
   if(openTime == 0) openTime = closeTime;

   double volume = closed ? MathMax(inVol, outVol) : MathMax(openVolume, inVol - outVol);
   string s = "{\"ticket\":\"" + IntegerToString(posId) + "\"" +
              ",\"symbol\":\"" + JsonEscape(symbol) + "\"" +
              ",\"type\":\"" + (dir == DEAL_TYPE_SELL ? "SELL" : "BUY") + "\"" +
              ",\"volume\":" + Num(volume, 8) +
              ",\"openPrice\":" + Num(inVol > 0 ? inPx / inVol : 0, 8) +
              ",\"stopLoss\":" + Num(sl, 8) +
              ",\"takeProfit\":" + Num(tp, 8) +
              ",\"profit\":" + Num(profit, 2) +
              ",\"commission\":" + Num(commission, 2) +
              ",\"swap\":" + Num(swap, 2) +
              ",\"openTime\":" + IntegerToString((long)openTime);
   if(closed)
      s += ",\"closePrice\":" + Num(outVol > 0 ? outPx / outVol : 0, 8) +
           ",\"closeTime\":" + IntegerToString((long)closeTime) + ",\"closed\":true}";
   else
      s += ",\"closed\":false}";
   return(s);
  }

bool InList(long v, long &list[])
  {
   for(int i = ArraySize(list) - 1; i >= 0; i--) if(list[i] == v) return(true);
   return(false);
  }

void Push(long v, long &list[])
  {
   int n = ArraySize(list); ArrayResize(list, n + 1); list[n] = v;
  }

//+------------------------------------------------------------------+
void Sync()
  {
   // ── پوزیشن‌های باز — هر بار کامل (شناسه = POSITION_IDENTIFIER، همان
   //    DEAL_POSITION_ID که بعد از بسته شدن فرستاده می‌شود؛ نه تیکت)
   long openIds[]; ArrayResize(openIds, 0);
   string openSyms[]; double openVols[], openSls[], openTps[], openProfits[];
   int total = PositionsTotal();
   for(int i = 0; i < total; i++)
     {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0) continue;
      int n = ArraySize(openIds);
      ArrayResize(openIds, n + 1); ArrayResize(openSyms, n + 1); ArrayResize(openVols, n + 1);
      ArrayResize(openSls, n + 1); ArrayResize(openTps, n + 1); ArrayResize(openProfits, n + 1);
      openIds[n]     = PositionGetInteger(POSITION_IDENTIFIER);
      openSyms[n]    = PositionGetString(POSITION_SYMBOL);
      openVols[n]    = PositionGetDouble(POSITION_VOLUME);
      openSls[n]     = PositionGetDouble(POSITION_SL);
      openTps[n]     = PositionGetDouble(POSITION_TP);
      openProfits[n] = PositionGetDouble(POSITION_PROFIT);
     }
   string openItems[]; ArrayResize(openItems, 0);
   for(int i = 0; i < ArraySize(openIds); i++)
     {
      string js = PositionJson(openIds[i], false, openSyms[i], openVols[i], openSls[i], openTps[i], openProfits[i]);
      if(js == "") continue;
      int n = ArraySize(openItems); ArrayResize(openItems, n + 1); openItems[n] = js;
     }
   if(!SendAll(openItems)) return;

   // ── پوزیشن‌های بسته. کلِ تاریخچه انتخاب می‌شود (تا یک روز جلوتر، چون
   //    TimeCurrent زمانِ آخرین تیک است و ممکن است از زمانِ آخرین deal عقب باشد)
   HistorySelect(0, TimeCurrent() + 86400);
   int deals = HistoryDealsTotal();
   long newAll = 0;
   for(int j = 0; j < deals; j++)
     {
      ulong d = HistoryDealGetTicket(j);
      if(d != 0 && (datetime)HistoryDealGetInteger(d, DEAL_TIME) > g_cursorTime) newAll++;
     }
   // اولین بار، یا تاریخچه‌ی قدیمی‌تر از کِرسر تازه پیدا شده → ارسالِ کامل
   bool full = (g_knownTotal <= 0 || g_cursorTime == 0 || deals - g_knownTotal > newAll);
   datetime since = full ? 0 : g_cursorTime - CURSOR_OVERLAP;

   long posIds[]; ArrayResize(posIds, 0);
   string cashItems[]; ArrayResize(cashItems, 0);
   datetime newCursor = g_cursorTime;
   for(int j = 0; j < deals; j++)
     {
      ulong deal = HistoryDealGetTicket(j);
      if(deal == 0) continue;
      datetime dealTime = (datetime)HistoryDealGetInteger(deal, DEAL_TIME);
      if(dealTime > newCursor) newCursor = dealTime;
      long dType = HistoryDealGetInteger(deal, DEAL_TYPE);
      // گردش پول غیرمعاملاتی: واریز/برداشت/اعتبار/بونوس/مالیات/کمیسیون حساب/بهره/...
      // قبلا کلا نادیده گرفته می‌شد و موجودی ژورنال با متاتریدر نمی‌خوند.
      if(dType != DEAL_TYPE_BUY && dType != DEAL_TYPE_SELL &&
         dType != DEAL_TYPE_BUY_CANCELED && dType != DEAL_TYPE_SELL_CANCELED)
        {
         if(!full && dealTime < since) continue;
         double amt = HistoryDealGetDouble(deal, DEAL_PROFIT) + HistoryDealGetDouble(deal, DEAL_COMMISSION) +
                      HistoryDealGetDouble(deal, DEAL_SWAP) + HistoryDealGetDouble(deal, DEAL_FEE);
         if(amt == 0) continue;
         string cj = "{\"ticket\":\"" + IntegerToString((long)deal) + "\"" +
                     ",\"type\":\"" + EnumToString((ENUM_DEAL_TYPE)dType) + "\"" +
                     ",\"amount\":" + Num(amt, 2) +
                     ",\"time\":" + IntegerToString((long)dealTime) +
                     ",\"comment\":\"" + JsonEscape(HistoryDealGetString(deal, DEAL_COMMENT)) + "\"}";
         int cn = ArraySize(cashItems); ArrayResize(cashItems, cn + 1); cashItems[cn] = cj;
         continue;
        }
      long entry = HistoryDealGetInteger(deal, DEAL_ENTRY);
      if(entry != DEAL_ENTRY_OUT && entry != DEAL_ENTRY_OUT_BY && entry != DEAL_ENTRY_INOUT) continue;
      long dealType = HistoryDealGetInteger(deal, DEAL_TYPE);
      if(dealType != DEAL_TYPE_BUY && dealType != DEAL_TYPE_SELL) continue;
      if(!full && dealTime < since) continue;
      long posId = HistoryDealGetInteger(deal, DEAL_POSITION_ID);
      if(posId == 0) continue;
      // هنوز باز است (partial close) — ردیفِ بازش همین بالا فرستاده شد؛ با
      // بسته شدنِ کامل، همه‌ی تکه‌ها با هم جمع می‌شوند.
      if(InList(posId, openIds) || InList(posId, posIds)) continue;
      Push(posId, posIds);
     }

   string closedItems[]; ArrayResize(closedItems, 0);
   for(int k = 0; k < ArraySize(posIds); k++)
     {
      string js = PositionJson(posIds[k], true, "", 0, 0, 0, 0);
      if(js == "") continue;
      int n = ArraySize(closedItems); ArrayResize(closedItems, n + 1); closedItems[n] = js;
     }

   if(ArraySize(closedItems) > 0 && !SendAll(closedItems)) return;
   if(ArraySize(cashItems) > 0 && !SendAll(cashItems, true)) return;

   g_cursorTime = newCursor;
   g_knownTotal = deals;
   SaveCursor();
   g_lastSync = TimeCurrent();
   g_status = "ارسال شد: " + IntegerToString(ArraySize(openItems)) + " باز، " +
              IntegerToString(ArraySize(closedItems)) + " بسته، " +
              IntegerToString(ArraySize(cashItems)) + " واریز/هزینه" + (full ? " (کلِ تاریخچه)" : "");
  }

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

long JsonInt(string json, string key)
  {
   string needle = "\"" + key + "\":";
   int start = StringFind(json, needle);
   if(start < 0) return(0);
   return(StringToInteger(StringSubstr(json, start + StringLen(needle), 12)));
  }
//+------------------------------------------------------------------+
