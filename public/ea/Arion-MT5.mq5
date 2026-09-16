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
#property version   "1.10"

input string ArionUrl    = "https://arionapp.ir"; // آدرس سایت Arion
input string PairingCode = "";                     // کد اتصال (فقط بار اول)
input int    SyncSeconds = 60;                     // فاصله‌ی ارسال، به ثانیه

// حداکثر تعداد معامله‌ی بسته‌شده در هر درخواست — تاریخچه‌ی طولانی توی چند
// درخواستِ پشتِ‌سرهم چانک می‌شه، نه یک درخواستِ غول‌پیکرِ تک.
#define MT_CHUNK_SIZE 300

string   g_token     = "";
string   g_tokenFile = "arion_token.txt";

// زمانِ deal بستنِ آخرین معامله‌ای که با موفقیت فرستاده شده. صفر یعنی
// «هنوز هیچ بک‌فیلی انجام نشده» — دفعه‌ی اول کل تاریخچه‌ی حساب فرستاده
// می‌شود (نه فقط ۳۰ روزِ اخیر). بعد از بک‌فیلِ کامل، هر سینکِ بعدی فقط از
// همین زمان به بعد را می‌خواند — سینک سریع می‌ماند.
datetime g_cursorTime = 0;
string   g_cursorFile = "arion_cursor.txt";

//+------------------------------------------------------------------+
int OnInit()
  {
   g_token = LoadToken();
   g_cursorTime = (datetime)LoadCursor();
   if(g_token == "" && PairingCode != "")
      Pair();
   EventSetTimer((int)MathMax(15, SyncSeconds));
   // منتظرِ اولین تیکِ تایمر نمی‌مانیم — همین که وصل شدیم (یا توکنِ قبلی را
   // پیدا کردیم)، بلافاصله یک سینک می‌زنیم تا اتصال حسِ آنی داشته باشد.
   if(g_token != "") Sync();
   return(INIT_SUCCEEDED);
  }

void OnDeinit(const int reason) { EventKillTimer(); }

void OnTimer() { if(g_token != "") Sync(); }

//+------------------------------------------------------------------+
string LoadToken()
  {
   int h = FileOpen(g_tokenFile, FILE_READ|FILE_TXT|FILE_ANSI);
   if(h == INVALID_HANDLE) return("");
   string t = FileReadString(h);
   FileClose(h);
   return(t);
  }

void SaveToken(string token)
  {
   int h = FileOpen(g_tokenFile, FILE_WRITE|FILE_TXT|FILE_ANSI);
   if(h == INVALID_HANDLE) { Print("Arion: نوشتن توکن ناموفق"); return; }
   FileWriteString(h, token);
   FileClose(h);
  }

long LoadCursor()
  {
   int h = FileOpen(g_cursorFile, FILE_READ|FILE_TXT|FILE_ANSI);
   if(h == INVALID_HANDLE) return(0);
   string s = FileReadString(h);
   FileClose(h);
   return(StringToInteger(s));
  }

void SaveCursor(datetime t)
  {
   int h = FileOpen(g_cursorFile, FILE_WRITE|FILE_TXT|FILE_ANSI);
   if(h == INVALID_HANDLE) return;
   FileWriteString(h, IntegerToString((long)t));
   FileClose(h);
  }

//+------------------------------------------------------------------+
string HttpPost(string url, string headers, string body, int &status)
  {
   char post[], result[];
   string resultHeaders;
   StringToCharArray(body, post, 0, StringLen(body), CP_UTF8);
   ArrayResize(post, StringLen(body));
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
void Pair()
  {
   string body = StringFormat(
      "{\"code\":\"%s\",\"platform\":\"MT5\",\"accountLogin\":\"%I64d\",\"server\":\"%s\",\"broker\":\"%s\"}",
      PairingCode, AccountInfoInteger(ACCOUNT_LOGIN),
      AccountInfoString(ACCOUNT_SERVER), AccountInfoString(ACCOUNT_COMPANY));

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
                              AccountInfoDouble(ACCOUNT_BALANCE), AccountInfoDouble(ACCOUNT_EQUITY),
                              AccountInfoString(ACCOUNT_CURRENCY), tradesJson);

   int status;
   string res = HttpPost(ArionUrl + "/api/mt/sync",
                         "Content-Type: application/json\r\nAuthorization: Bearer " + g_token + "\r\n",
                         body, status);

   if(status == 401)
     {
      Print("Arion: توکن معتبر نیست — از پنل Arion کد اتصال جدید بگیرید");
      g_token = "";
      SaveToken("");
      return(false);
     }
   if(status != 200) { Print("Arion: ارسال ناموفق (", status, ") ", res); return(false); }
   return(true);
  }

//+------------------------------------------------------------------+
//| مجموعِ کمیسیون/سواپِ یک پوزیشن روی همه‌ی dealهایش (ورود + خروج).    |
//| چرا لازم است: بعضی بروکرها کمیسیون را نصف روی dealِ ورود و نصف روی  |
//| dealِ خروج می‌زنند — اگر فقط dealِ بستن را بخوانیم، نصفِ کمیسیون جا   |
//| می‌ماند. HistorySelectByPosition خودش context انتخابِ فعلی را عوض   |
//| می‌کند، برای همین بعدش HistorySelect را با همان بازه دوباره صدا      |
//| می‌زنیم تا حلقه‌ی بیرونی (که روی بازه‌ی from..now کار می‌کند) خراب     |
//| نشود.                                                               |
//+------------------------------------------------------------------+
void PositionCommissionSwap(long positionId, datetime from, double &outCommission, double &outSwap)
  {
   outCommission = 0;
   outSwap = 0;
   if(HistorySelectByPosition(positionId))
     {
      int n = HistoryDealsTotal();
      for(int i = 0; i < n; i++)
        {
         ulong d = HistoryDealGetTicket(i);
         outCommission += HistoryDealGetDouble(d, DEAL_COMMISSION);
         outSwap       += HistoryDealGetDouble(d, DEAL_SWAP);
        }
     }
   // بازگرداندنِ انتخابِ اصلی — وگرنه حلقه‌ی بیرونی که روی همین بازه کار
   // می‌کند از اینجا به بعد دادهٔ اشتباه می‌بیند.
   HistorySelect(from, TimeCurrent());
  }

//+------------------------------------------------------------------+
void Sync()
  {
   // پوزیشن‌های باز — هر بار کامل فرستاده می‌شوند
   string openTrades = "";
   int openCount = 0;
   for(int i = 0; i < PositionsTotal(); i++)
     {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0) continue;
      if(openCount > 0) openTrades += ",";
      openTrades += StringFormat(
         "{\"ticket\":\"%I64u\",\"symbol\":\"%s\",\"type\":\"%s\",\"volume\":%.2f,"
         "\"openPrice\":%.5f,\"stopLoss\":%.5f,\"takeProfit\":%.5f,"
         "\"profit\":%.2f,\"swap\":%.2f,\"openTime\":%I64d,\"closed\":false}",
         ticket, PositionGetString(POSITION_SYMBOL),
         (PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY ? "BUY" : "SELL"),
         PositionGetDouble(POSITION_VOLUME), PositionGetDouble(POSITION_PRICE_OPEN),
         PositionGetDouble(POSITION_SL), PositionGetDouble(POSITION_TP),
         PositionGetDouble(POSITION_PROFIT), PositionGetDouble(POSITION_SWAP),
         PositionGetInteger(POSITION_TIME));
      openCount++;
     }
   if(!SendBatch(openTrades)) return;

   // معاملاتِ بسته‌ی تازه — از کِرسرِ فعلی تا الان. دفعه‌ی اول (کِرسر صفر)
   // یعنی کلِ تاریخچه‌ی حساب، نه فقط ۳۰ روزِ اخیر.
   //
   // نکته: اگر پوزیشنی چند بار پشتِ‌سرهم partial-close شود، همه‌ی آن
   // dealهای خروج همان DEAL_POSITION_ID را دارند و در Arion روی یک ردیف
   // می‌نشینند (شناسه‌ی یکتا همان position id است) — یعنی فقط آخرین
   // partial-close دیده می‌شود. این محدودیتِ شناخته‌شده‌ایست و جدا از
   // مشکلِ کمیسیون/سواپ/بازه‌ی تاریخچه است که اینجا رفع شده.
   datetime from = g_cursorTime;
   HistorySelect(from, TimeCurrent());
   int deals = HistoryDealsTotal();

   string batch[]; ArrayResize(batch, 0);
   datetime newCursor = g_cursorTime;

   for(int j = 0; j < deals; j++)
     {
      ulong deal = HistoryDealGetTicket(j);
      if(deal == 0) continue;
      if(HistoryDealGetInteger(deal, DEAL_ENTRY) != DEAL_ENTRY_OUT) continue;

      long dealType = HistoryDealGetInteger(deal, DEAL_TYPE);
      if(dealType != DEAL_TYPE_BUY && dealType != DEAL_TYPE_SELL) continue;

      datetime dealTime = (datetime)HistoryDealGetInteger(deal, DEAL_TIME);
      if(dealTime <= g_cursorTime) continue;

      long posId = (long)HistoryDealGetInteger(deal, DEAL_POSITION_ID);
      double commission, swap;
      PositionCommissionSwap(posId, from, commission, swap);
      // PositionCommissionSwap انتخابِ history را دوباره روی from..now
      // گذاشت، پس deals همچنان معتبر است؛ ولی چون HistorySelect دوباره
      // صدا زده شده، برای اطمینان دوباره همان deal را با HistoryDealGetTicket
      // نمی‌خوانیم — مقادیرِ لازم (dealType، dealTime، symbol، …) را همین
      // بالا از قبل گرفته‌ایم.

      int n = ArraySize(batch);
      ArrayResize(batch, n + 1);
      batch[n] = StringFormat(
         "{\"ticket\":\"%I64u\",\"symbol\":\"%s\",\"type\":\"%s\",\"volume\":%.2f,"
         "\"closePrice\":%.5f,\"profit\":%.2f,\"commission\":%.2f,\"swap\":%.2f,"
         "\"openTime\":%I64d,\"closeTime\":%I64d,\"closed\":true}",
         (ulong)posId,
         HistoryDealGetString(deal, DEAL_SYMBOL),
         // deal بستن، جهت مخالف خود پوزیشن است — پس برعکسش می‌کنیم
         (dealType == DEAL_TYPE_SELL ? "BUY" : "SELL"),
         HistoryDealGetDouble(deal, DEAL_VOLUME),
         HistoryDealGetDouble(deal, DEAL_PRICE),
         HistoryDealGetDouble(deal, DEAL_PROFIT),
         commission, swap,
         (long)dealTime, (long)dealTime);

      if(dealTime > newCursor) newCursor = dealTime;
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
      // اگه یک دسته شکست بخورد همین‌جا متوقف می‌شویم — چون کِرسر هنوز
      // آپدیت نشده، دفعه‌ی بعد همین بازه دوباره (و امن، چون سمتِ سرور با
      // شناسه‌ی یکتای هر پوزیشن ضدتکرار است) امتحان می‌شود.
      if(!SendBatch(chunk)) return;
      sent = end;
      if(sent < nClosed) Sleep(250); // فشار روی سرور/محدودیتِ نرخ را کم نگه می‌دارد
     }

   if(newCursor > g_cursorTime) { g_cursorTime = newCursor; SaveCursor(g_cursorTime); }
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
//+------------------------------------------------------------------+
