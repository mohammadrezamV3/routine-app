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
#property copyright "Arion"
#property link      "https://arionapp.ir"
#property version   "1.10"
#property strict

input string ArionUrl     = "https://arionapp.ir"; // آدرس سایت Arion
input string PairingCode  = "";                     // کد اتصال (فقط بار اول)
input int    SyncSeconds  = 60;                     // فاصله‌ی ارسال، به ثانیه

// حداکثر تعداد معامله‌ی بسته‌شده در هر درخواست — تاریخچه‌ی طولانی توی چند
// درخواستِ پشتِ‌سرهم چانک می‌شه، نه یک درخواستِ غول‌پیکرِ تک.
#define MT_CHUNK_SIZE 300

// توکن بعد از اولین اتصال موفق روی همین ترمینال ذخیره می‌شود تا کد اتصال
// دیگر لازم نباشد.
string   g_token       = "";
datetime g_lastSync    = 0;
string   g_tokenFile   = "arion_token.txt";

// زمانِ close آخرین معامله‌ای که با موفقیت فرستاده شده. صفر یعنی «هنوز هیچ
// بک‌فیلی انجام نشده» — یعنی دفعه‌ی اول کل تاریخچه‌ی حساب فرستاده می‌شود، نه
// فقط چند تای آخر. بعد از اولین بک‌فیلِ کامل، هر سینکِ بعدی فقط معاملاتی که
// از این زمان به بعد بسته شده‌اند را می‌فرستد — همان چیزی که سینک را سریع
// نگه می‌دارد.
int      g_cursorTime  = 0;
string   g_cursorFile  = "arion_cursor.txt";

//+------------------------------------------------------------------+
int OnInit()
  {
   g_token = LoadToken();
   g_cursorTime = LoadCursor();
   if(g_token == "" && PairingCode != "")
      Pair();
   EventSetTimer(MathMax(15, SyncSeconds));
   // منتظرِ اولین تیکِ تایمر نمی‌مانیم — همین که وصل شدیم (یا توکنِ قبلی را
   // پیدا کردیم)، بلافاصله یک سینک می‌زنیم تا اتصال حسِ آنی داشته باشد.
   if(g_token != "") Sync();
   return(INIT_SUCCEEDED);
  }

void OnDeinit(const int reason) { EventKillTimer(); }

void OnTimer() { if(g_token != "") Sync(); }

//+------------------------------------------------------------------+
//| ذخیره و خواندن توکن / کِرسر                                       |
//+------------------------------------------------------------------+
string LoadToken()
  {
   int h = FileOpen(g_tokenFile, FILE_READ|FILE_TXT);
   if(h == INVALID_HANDLE) return("");
   string t = FileReadString(h);
   FileClose(h);
   return(t);
  }

void SaveToken(string token)
  {
   int h = FileOpen(g_tokenFile, FILE_WRITE|FILE_TXT);
   if(h == INVALID_HANDLE) { Print("Arion: نوشتن توکن ناموفق"); return; }
   FileWriteString(h, token);
   FileClose(h);
  }

int LoadCursor()
  {
   int h = FileOpen(g_cursorFile, FILE_READ|FILE_TXT);
   if(h == INVALID_HANDLE) return(0);
   string s = FileReadString(h);
   FileClose(h);
   return((int)StringToInteger(s));
  }

void SaveCursor(int t)
  {
   int h = FileOpen(g_cursorFile, FILE_WRITE|FILE_TXT);
   if(h == INVALID_HANDLE) return;
   FileWriteString(h, IntegerToString(t));
   FileClose(h);
  }

//+------------------------------------------------------------------+
//| درخواست HTTP                                                     |
//+------------------------------------------------------------------+
string HttpPost(string url, string headers, string body, int &status)
  {
   char post[], result[];
   string resultHeaders;
   StringToCharArray(body, post, 0, StringLen(body), CP_UTF8);
   ArrayResize(post, StringLen(body)); // بدون بایت پایانی صفر
   ResetLastError();
   status = WebRequest("POST", url, headers, 10000, post, result, resultHeaders);
   if(status == -1)
     {
      Print("Arion: WebRequest ناموفق (کد ", GetLastError(),
            "). آدرس سایت را در Tools → Options → Expert Advisors اضافه کرده‌اید؟");
      return("");
     }
   return(CharArrayToString(result, 0, WHOLE_ARRAY, CP_UTF8));
  }

//+------------------------------------------------------------------+
//| اتصال اولیه با کد                                                |
//+------------------------------------------------------------------+
void Pair()
  {
   string body = StringFormat(
      "{\"code\":\"%s\",\"platform\":\"MT4\",\"accountLogin\":\"%d\",\"server\":\"%s\",\"broker\":\"%s\"}",
      PairingCode, AccountNumber(), AccountServer(), AccountCompany());

   int status;
   string res = HttpPost(ArionUrl + "/api/mt/pair", "Content-Type: application/json\r\n", body, status);
   if(status != 200) { Print("Arion: اتصال ناموفق (", status, ") ", res); return; }

   string token = JsonValue(res, "token");
   if(token == "") { Print("Arion: پاسخ سرور توکن نداشت"); return; }

   g_token = token;
   SaveToken(token);
   Print("Arion: اتصال برقرار شد — در حال گرفتنِ کل تاریخچه‌ی حساب…");
  }

//+------------------------------------------------------------------+
//| یک دسته از معاملات را می‌فرستد (بالانس/اکوئیتی همیشه همراهش می‌رود)  |
//+------------------------------------------------------------------+
bool SendBatch(string tradesJson)
  {
   string body = StringFormat("{\"balance\":%.2f,\"equity\":%.2f,\"currency\":\"%s\",\"trades\":[%s]}",
                              AccountBalance(), AccountEquity(), AccountCurrency(), tradesJson);

   int status;
   string res = HttpPost(ArionUrl + "/api/mt/sync",
                         "Content-Type: application/json\r\nAuthorization: Bearer " + g_token + "\r\n",
                         body, status);

   if(status == 401)
     {
      // توکن باطل شده (کاربر از پنل ابطالش کرده یا کد جدید گرفته)
      Print("Arion: توکن معتبر نیست — از پنل Arion کد اتصال جدید بگیرید");
      g_token = "";
      SaveToken("");
      return(false);
     }
   if(status != 200) { Print("Arion: ارسال ناموفق (", status, ") ", res); return(false); }
   return(true);
  }

//+------------------------------------------------------------------+
//| ارسال معاملات                                                    |
//+------------------------------------------------------------------+
void Sync()
  {
   // معاملات باز — هر بار کامل فرستاده می‌شوند (سود/حجم/… هر لحظه عوض می‌شود)
   string openTrades = "";
   int openCount = 0;
   for(int i = 0; i < OrdersTotal(); i++)
     {
      if(!OrderSelect(i, SELECT_BY_POS, MODE_TRADES)) continue;
      if(OrderType() > OP_SELL) continue; // فقط خرید/فروش، نه سفارش‌های در انتظار
      if(openCount > 0) openTrades += ",";
      openTrades += TradeJson(false);
      openCount++;
     }
   if(!SendBatch(openTrades)) return;

   // معاملاتِ بسته‌ی تازه — هرچه از کِرسرِ فعلی به بعد بسته شده. دفعه‌ی اول
   // (کِرسر صفر) یعنی کلِ تاریخچه‌ی حساب، نه فقط چند تای آخر.
   int total = OrdersHistoryTotal();
   string batch[]; ArrayResize(batch, 0);
   int newCursor = g_cursorTime;
   for(int j = 0; j < total; j++)
     {
      if(!OrderSelect(j, SELECT_BY_POS, MODE_HISTORY)) continue;
      if(OrderType() > OP_SELL) continue;
      int ct = (int)OrderCloseTime();
      if(ct <= g_cursorTime) continue;
      int n = ArraySize(batch);
      ArrayResize(batch, n + 1);
      batch[n] = TradeJson(true);
      if(ct > newCursor) newCursor = ct;
     }

   int nClosed = ArraySize(batch);
   int sent = 0;
   while(sent < nClosed)
     {
      int end = MathMin(sent + MT_CHUNK_SIZE, nClosed);
      string chunk = "";
      for(int k = sent; k < end; k++)
        {
         if(k > sent) chunk += ",";
         chunk += batch[k];
        }
      // اگه یک دسته شکست بخورد، همین‌جا متوقف می‌شویم — چون کِرسر هنوز
      // آپدیت نشده، دفعه‌ی بعد همین بازه دوباره (و امن، چون سمتِ سرور با
      // شناسه‌ی یکتای هر تیکت ضدتکرار است) امتحان می‌شود.
      if(!SendBatch(chunk)) return;
      sent = end;
      if(sent < nClosed) Sleep(250); // فشار روی سرور/محدودیتِ نرخ را کم نگه می‌دارد
     }

   if(newCursor > g_cursorTime) { g_cursorTime = newCursor; SaveCursor(g_cursorTime); }
   g_lastSync = TimeCurrent();
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
      OrderTicket(), OrderSymbol(), (OrderType() == OP_BUY ? "BUY" : "SELL"), OrderLots(),
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
