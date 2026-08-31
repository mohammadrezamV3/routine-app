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
#property version   "1.00"

input string ArionUrl    = "https://arionapp.ir"; // آدرس سایت Arion
input string PairingCode = "";                     // کد اتصال (فقط بار اول)
input int    SyncSeconds = 60;                     // فاصله‌ی ارسال، به ثانیه

string g_token     = "";
string g_tokenFile = "arion_token.txt";

//+------------------------------------------------------------------+
int OnInit()
  {
   g_token = LoadToken();
   if(g_token == "" && PairingCode != "")
      Pair();
   EventSetTimer((int)MathMax(15, SyncSeconds));
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
   Print("Arion: اتصال برقرار شد");
  }

//+------------------------------------------------------------------+
void Sync()
  {
   string trades = "";
   int count = 0;

   // پوزیشن‌های باز
   for(int i = 0; i < PositionsTotal(); i++)
     {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0) continue;
      if(count > 0) trades += ",";
      trades += StringFormat(
         "{\"ticket\":\"%I64u\",\"symbol\":\"%s\",\"type\":\"%s\",\"volume\":%.2f,"
         "\"openPrice\":%.5f,\"stopLoss\":%.5f,\"takeProfit\":%.5f,"
         "\"profit\":%.2f,\"swap\":%.2f,\"openTime\":%I64d,\"closed\":false}",
         ticket, PositionGetString(POSITION_SYMBOL),
         (PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY ? "BUY" : "SELL"),
         PositionGetDouble(POSITION_VOLUME), PositionGetDouble(POSITION_PRICE_OPEN),
         PositionGetDouble(POSITION_SL), PositionGetDouble(POSITION_TP),
         PositionGetDouble(POSITION_PROFIT), PositionGetDouble(POSITION_SWAP),
         PositionGetInteger(POSITION_TIME));
      count++;
     }

   // معاملات بسته‌ی ۳۰ روز اخیر — در MT5 هر پوزیشن از چند «deal» ساخته
   // می‌شود؛ deal با ENTRY_OUT همان بسته‌شدنِ پوزیشن است و شناسه‌ی پوزیشن
   // را دارد، پس دقیقاً همان externalId سمت سرور می‌شود.
   datetime from = TimeCurrent() - 30 * 24 * 60 * 60;
   HistorySelect(from, TimeCurrent());
   int deals = HistoryDealsTotal();
   for(int j = 0; j < deals; j++)
     {
      ulong deal = HistoryDealGetTicket(j);
      if(deal == 0) continue;
      if(HistoryDealGetInteger(deal, DEAL_ENTRY) != DEAL_ENTRY_OUT) continue;

      long dealType = HistoryDealGetInteger(deal, DEAL_TYPE);
      if(dealType != DEAL_TYPE_BUY && dealType != DEAL_TYPE_SELL) continue;

      if(count > 0) trades += ",";
      trades += StringFormat(
         "{\"ticket\":\"%I64u\",\"symbol\":\"%s\",\"type\":\"%s\",\"volume\":%.2f,"
         "\"closePrice\":%.5f,\"profit\":%.2f,\"commission\":%.2f,\"swap\":%.2f,"
         "\"openTime\":%I64d,\"closeTime\":%I64d,\"closed\":true}",
         HistoryDealGetInteger(deal, DEAL_POSITION_ID),
         HistoryDealGetString(deal, DEAL_SYMBOL),
         // deal بستن، جهتِ مخالفِ خودِ پوزیشن است — پس برعکسش می‌کنیم
         (dealType == DEAL_TYPE_SELL ? "BUY" : "SELL"),
         HistoryDealGetDouble(deal, DEAL_VOLUME),
         HistoryDealGetDouble(deal, DEAL_PRICE),
         HistoryDealGetDouble(deal, DEAL_PROFIT),
         HistoryDealGetDouble(deal, DEAL_COMMISSION),
         HistoryDealGetDouble(deal, DEAL_SWAP),
         HistoryDealGetInteger(deal, DEAL_TIME),
         HistoryDealGetInteger(deal, DEAL_TIME));
      count++;
     }

   string body = StringFormat("{\"balance\":%.2f,\"equity\":%.2f,\"currency\":\"%s\",\"trades\":[%s]}",
                              AccountInfoDouble(ACCOUNT_BALANCE), AccountInfoDouble(ACCOUNT_EQUITY),
                              AccountInfoString(ACCOUNT_CURRENCY), trades);

   int status;
   string res = HttpPost(ArionUrl + "/api/mt/sync",
                         "Content-Type: application/json\r\nAuthorization: Bearer " + g_token + "\r\n",
                         body, status);

   if(status == 401)
     {
      Print("Arion: توکن معتبر نیست — از پنل Arion کد اتصال جدید بگیرید");
      g_token = "";
      SaveToken("");
      return;
     }
   if(status != 200) Print("Arion: ارسال ناموفق (", status, ") ", res);
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
