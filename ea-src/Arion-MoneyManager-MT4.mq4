//+------------------------------------------------------------------+
//| Arion-MoneyManager-MT4.mq4                                       |
//| Standalone money management expert: on-chart panel + rules.      |
//| All settings are inputs; no website connection is needed.        |
//+------------------------------------------------------------------+
#property copyright "Arion"
#property version   "1.00"
#property strict
#property description "Arion Money Manager: risk based lot calculator, one click orders and account protection rules."
#property description "Test on a demo account first. Trading involves risk."

enum ENUM_TP_MODE { TP_PIPS = 0, TP_RR = 1 };
enum ENUM_PANEL_POS { PANEL_TOP_LEFT = 0, PANEL_TOP_RIGHT = 1, PANEL_BOTTOM_LEFT = 2, PANEL_BOTTOM_RIGHT = 3 };

//--- Panel
extern ENUM_PANEL_POS PanelCorner      = PANEL_TOP_LEFT; // Panel corner
extern double         DefaultRiskPct   = 1.0;            // Default risk per trade (% of balance)
extern double         DefaultSLPips    = 20.0;           // Default stop loss (pips)
extern double         DefaultTP        = 2.0;            // Default TP (pips or R:R, see TpMode)
extern ENUM_TP_MODE   TpMode           = TP_RR;          // TP meaning: pips or R:R multiple
extern int            MagicNumber      = 26050101;       // Magic number for orders from the panel
extern int            SlippagePoints   = 30;             // Max slippage (points)

//--- Scope
extern bool           ManageAllSymbols = true;           // true: all positions, false: chart symbol only
extern int            ManageMagic      = -1;             // -1: all magics, 0: manual only, else that magic only

//--- Rules (0 = off)
extern double         MaxRiskPerTradePct   = 0;          // Max risk per position (% of balance), oversized ones are reduced
extern bool           RequireSL            = false;      // Every position must have a stop loss
extern double         AutoSLPips           = 0;          // Auto stop loss for positions without one (pips), 0 = close after grace
extern int            SLGraceSec           = 60;         // Seconds before a position without SL is closed
extern int            MaxOpenTrades        = 0;          // Max open positions (newest closed first)
extern int            MaxDailyTrades       = 0;          // Max new trades per server day (newest closed first)
extern double         MaxDailyLossPct      = 0;          // Daily loss limit (% of day start balance): close all and lock
extern double         DailyProfitTargetPct = 0;          // Daily profit target (% of day start balance)
extern bool           LockOnTarget         = false;      // Close all and lock when target is reached
extern double         BreakEvenAtR         = 0;          // Move SL to entry when profit reaches this R
extern int            BEOffsetPoints       = 0;          // Break even offset (points beyond entry)
extern double         TrailingStartR       = 0;          // Start trailing at this R
extern double         TrailingDistR        = 0;          // Trailing distance in R
extern double         PartialCloseAtR      = 0;          // Close part of the position at this R (once)
extern double         PartialClosePct      = 50;         // Percent of volume to close at PartialCloseAtR
extern bool           AlertOnAction        = false;      // Show an alert for every action

#define OBJ_PREFIX "ARMM_"
#define PW 260
#define PH 334

// panel state
double g_risk = 1.0, g_slPips = 20.0, g_tp = 2.0;
string g_nm[]; int g_dx[]; int g_dy[];
int    g_lastW = 0, g_lastH = 0;
string g_msg = ""; datetime g_msgAt = 0;

// rules state
bool     g_busy = false;
uint     g_lastRun = 0;
long     g_dayKey = -1;
double   g_dayBal = 0, g_closed = 0, g_pnl = 0, g_openRisk = 0;
int      g_lock = 0;            // 0 free, 1 daily loss lock, 2 profit target lock
int      g_killed = 0;          // positions closed today by the daily trades cap
int      g_openedToday = 0, g_posCnt = 0;
bool     g_statsDirty = true;
datetime g_statsAt = 0;
bool     g_targetNoted = false;
string   g_lastErr = ""; datetime g_lastErrAt = 0;
datetime g_lastPrune = 0;

//+------------------------------------------------------------------+
//| helpers                                                          |
//+------------------------------------------------------------------+
void Act(string action, int ticket, string detail)
  {
   string m = "Arion MM: " + action + " #" + IntegerToString(ticket) + " " + detail;
   Print(m);
   if(AlertOnAction) Alert(m);
  }

void ActError(int ticket, string what)
  {
   string key = IntegerToString(ticket) + what;
   if(key == g_lastErr && TimeLocal() - g_lastErrAt < 60) return;
   g_lastErr = key; g_lastErrAt = TimeLocal();
   Print("Arion MM: ERROR #", IntegerToString(ticket), " ", what);
  }

string GvName(string kind, int id = 0)
  {
   return(OBJ_PREFIX + IntegerToString(AccountNumber()) + "_" + kind + (id != 0 ? "_" + IntegerToString(id) : ""));
  }

double PipSize(string sym)
  {
   double pt = MarketInfo(sym, MODE_POINT);
   int d = (int)MarketInfo(sym, MODE_DIGITS);
   return((d == 3 || d == 5) ? pt * 10.0 : pt);
  }

int VolDigits(double step)
  {
   int d = 0;
   while(step < 0.99999 && d < 8) { step *= 10.0; d++; }
   return(d);
  }

bool Managed(string sym, int magic)
  {
   if(!ManageAllSymbols && sym != Symbol()) return(false);
   if(ManageMagic >= 0 && magic != ManageMagic) return(false);
   return(true);
  }

// money lost per 1.0 price unit of movement for a volume
double MoneyPerUnit(string sym, double vol)
  {
   double tv = MarketInfo(sym, MODE_TICKVALUE);
   double ts = MarketInfo(sym, MODE_TICKSIZE);
   if(tv <= 0 || ts <= 0) return(0);
   return(vol * tv / ts);
  }

int MinStopPoints(string sym)
  {
   return((int)MathMax(MarketInfo(sym, MODE_STOPLEVEL), MarketInfo(sym, MODE_FREEZELEVEL)));
  }

bool StopsOk(string sym, bool buy, double sl)
  {
   double pt = MarketInfo(sym, MODE_POINT);
   double minD = MinStopPoints(sym) * pt;
   if(buy) return(sl <= MarketInfo(sym, MODE_BID) - minD);
   return(sl >= MarketInfo(sym, MODE_ASK) + minD);
  }

// ticket of the order this one was split from ("from #123"), 0 if none
int SplitSource(string comment)
  {
   int p = StringFind(comment, "from #");
   if(p < 0) return(0);
   return((int)StringToInteger(StringSubstr(comment, p + 6)));
  }

//+------------------------------------------------------------------+
//| lot calculation                                                  |
//+------------------------------------------------------------------+
double CalcLot(double &riskMoney, string &warn)
  {
   warn = "";
   string sym = Symbol();
   riskMoney = AccountBalance() * g_risk / 100.0;
   double slDist = g_slPips * PipSize(sym);
   if(g_risk <= 0 || slDist <= 0) { warn = "Set risk % and SL pips"; return(0); }
   double loss = MoneyPerUnit(sym, 1.0) * slDist;
   if(loss <= 0) { warn = "Cannot read tick value"; return(0); }
   double step = MarketInfo(sym, MODE_LOTSTEP);
   double minV = MarketInfo(sym, MODE_MINLOT);
   double maxV = MarketInfo(sym, MODE_MAXLOT);
   if(step <= 0) step = minV;
   double raw = riskMoney / loss;
   if(raw < minV) { warn = "Risk too small for min lot " + DoubleToString(minV, VolDigits(step)); return(0); }
   double lot = MathFloor(raw / step + 1e-9) * step;
   if(lot > maxV) lot = maxV;
   lot = NormalizeDouble(lot, VolDigits(step));
   if(lot < minV) { warn = "Risk too small for min lot"; return(0); }
   return(lot);
  }

double TpDistance()
  {
   if(g_tp <= 0) return(0);
   if(TpMode == TP_RR) return(g_slPips * PipSize(Symbol()) * g_tp);
   return(g_tp * PipSize(Symbol()));
  }

//+------------------------------------------------------------------+
//| panel objects                                                    |
//+------------------------------------------------------------------+
void Reg(string n, int dx, int dy)
  {
   int k = ArraySize(g_nm);
   ArrayResize(g_nm, k + 1); ArrayResize(g_dx, k + 1); ArrayResize(g_dy, k + 1);
   g_nm[k] = n; g_dx[k] = dx; g_dy[k] = dy;
  }

void MkRect(string n, int dx, int dy, int w, int h, color bg, color border)
  {
   ObjectCreate(0, n, OBJ_RECTANGLE_LABEL, 0, 0, 0);
   ObjectSetInteger(0, n, OBJPROP_CORNER, CORNER_LEFT_UPPER);
   ObjectSetInteger(0, n, OBJPROP_XSIZE, w);
   ObjectSetInteger(0, n, OBJPROP_YSIZE, h);
   ObjectSetInteger(0, n, OBJPROP_BGCOLOR, bg);
   ObjectSetInteger(0, n, OBJPROP_BORDER_TYPE, BORDER_FLAT);
   ObjectSetInteger(0, n, OBJPROP_COLOR, border);
   ObjectSetInteger(0, n, OBJPROP_SELECTABLE, false);
   ObjectSetInteger(0, n, OBJPROP_HIDDEN, true);
   Reg(n, dx, dy);
  }

void MkLabel(string n, int dx, int dy, string text, color c, int size = 9)
  {
   ObjectCreate(0, n, OBJ_LABEL, 0, 0, 0);
   ObjectSetInteger(0, n, OBJPROP_CORNER, CORNER_LEFT_UPPER);
   ObjectSetInteger(0, n, OBJPROP_ANCHOR, ANCHOR_LEFT_UPPER);
   ObjectSetString(0, n, OBJPROP_TEXT, text);
   ObjectSetString(0, n, OBJPROP_FONT, "Arial");
   ObjectSetInteger(0, n, OBJPROP_FONTSIZE, size);
   ObjectSetInteger(0, n, OBJPROP_COLOR, c);
   ObjectSetInteger(0, n, OBJPROP_SELECTABLE, false);
   ObjectSetInteger(0, n, OBJPROP_HIDDEN, true);
   Reg(n, dx, dy);
  }

void MkEdit(string n, int dx, int dy, int w, string text)
  {
   ObjectCreate(0, n, OBJ_EDIT, 0, 0, 0);
   ObjectSetInteger(0, n, OBJPROP_CORNER, CORNER_LEFT_UPPER);
   ObjectSetInteger(0, n, OBJPROP_XSIZE, w);
   ObjectSetInteger(0, n, OBJPROP_YSIZE, 20);
   ObjectSetString(0, n, OBJPROP_TEXT, text);
   ObjectSetString(0, n, OBJPROP_FONT, "Arial");
   ObjectSetInteger(0, n, OBJPROP_FONTSIZE, 9);
   ObjectSetInteger(0, n, OBJPROP_COLOR, clrWhite);
   ObjectSetInteger(0, n, OBJPROP_BGCOLOR, C'44,50,66');
   ObjectSetInteger(0, n, OBJPROP_BORDER_COLOR, C'84,92,112');
   ObjectSetInteger(0, n, OBJPROP_ALIGN, ALIGN_CENTER);
   ObjectSetInteger(0, n, OBJPROP_READONLY, false);
   ObjectSetInteger(0, n, OBJPROP_SELECTABLE, false);
   ObjectSetInteger(0, n, OBJPROP_HIDDEN, true);
   Reg(n, dx, dy);
  }

void MkButton(string n, int dx, int dy, int w, int h, string text, color bg)
  {
   ObjectCreate(0, n, OBJ_BUTTON, 0, 0, 0);
   ObjectSetInteger(0, n, OBJPROP_CORNER, CORNER_LEFT_UPPER);
   ObjectSetInteger(0, n, OBJPROP_XSIZE, w);
   ObjectSetInteger(0, n, OBJPROP_YSIZE, h);
   ObjectSetString(0, n, OBJPROP_TEXT, text);
   ObjectSetString(0, n, OBJPROP_FONT, "Arial");
   ObjectSetInteger(0, n, OBJPROP_FONTSIZE, 9);
   ObjectSetInteger(0, n, OBJPROP_COLOR, clrWhite);
   ObjectSetInteger(0, n, OBJPROP_BGCOLOR, bg);
   ObjectSetInteger(0, n, OBJPROP_BORDER_COLOR, bg);
   ObjectSetInteger(0, n, OBJPROP_STATE, false);
   ObjectSetInteger(0, n, OBJPROP_SELECTABLE, false);
   ObjectSetInteger(0, n, OBJPROP_HIDDEN, true);
   Reg(n, dx, dy);
  }

void SetText(string n, string text, color c)
  {
   ObjectSetString(0, n, OBJPROP_TEXT, text);
   ObjectSetInteger(0, n, OBJPROP_COLOR, c);
  }

void Layout()
  {
   int w = (int)ChartGetInteger(0, CHART_WIDTH_IN_PIXELS);
   int h = (int)ChartGetInteger(0, CHART_HEIGHT_IN_PIXELS);
   g_lastW = w; g_lastH = h;
   int ox = 10, oy = 20;
   if(PanelCorner == PANEL_TOP_RIGHT || PanelCorner == PANEL_BOTTOM_RIGHT) ox = MathMax(0, w - PW - 10);
   if(PanelCorner == PANEL_BOTTOM_LEFT || PanelCorner == PANEL_BOTTOM_RIGHT) oy = MathMax(0, h - PH - 10);
   for(int i = 0; i < ArraySize(g_nm); i++)
     {
      ObjectSetInteger(0, g_nm[i], OBJPROP_XDISTANCE, ox + g_dx[i]);
      ObjectSetInteger(0, g_nm[i], OBJPROP_YDISTANCE, oy + g_dy[i]);
     }
  }

void BuildPanel()
  {
   ArrayResize(g_nm, 0); ArrayResize(g_dx, 0); ArrayResize(g_dy, 0);
   color txt = C'200,206,220';
   MkRect(OBJ_PREFIX + "bg", 0, 0, PW, PH, C'22,26,36', C'70,78,98');
   MkRect(OBJ_PREFIX + "head", 0, 0, PW, 22, C'38,44,60', C'38,44,60');
   MkLabel(OBJ_PREFIX + "title", 10, 4, "ARION MONEY MANAGER", clrWhite, 9);
   MkLabel(OBJ_PREFIX + "l_risk", 10, 30, "Risk %", txt);
   MkEdit(OBJ_PREFIX + "e_risk", 110, 28, 140, DoubleToString(g_risk, 2));
   MkLabel(OBJ_PREFIX + "l_sl", 10, 54, "SL (pips)", txt);
   MkEdit(OBJ_PREFIX + "e_sl", 110, 52, 140, DoubleToString(g_slPips, 1));
   MkLabel(OBJ_PREFIX + "l_tp", 10, 78, (TpMode == TP_RR ? "TP (R:R)" : "TP (pips)"), txt);
   MkEdit(OBJ_PREFIX + "e_tp", 110, 76, 140, DoubleToString(g_tp, 2));
   MkLabel(OBJ_PREFIX + "lot", 10, 104, "", clrWhite, 10);
   MkLabel(OBJ_PREFIX + "warn", 10, 124, "", C'255,170,60', 8);
   MkButton(OBJ_PREFIX + "b_buy", 10, 144, 115, 28, "BUY", C'16,150,96');
   MkButton(OBJ_PREFIX + "b_sell", 135, 144, 115, 28, "SELL", C'200,60,70');
   MkButton(OBJ_PREFIX + "b_close", 10, 178, 115, 24, "CLOSE ALL", C'70,78,98');
   MkButton(OBJ_PREFIX + "b_be", 135, 178, 115, 24, "BREAKEVEN ALL", C'70,78,98');
   string info[] = {"i_bal", "i_eq", "i_pnl", "i_risk", "i_pos", "i_day", "i_lock"};
   for(int i = 0; i < ArraySize(info); i++)
      MkLabel(OBJ_PREFIX + info[i], 10, 210 + i * 17, "", txt, 9);
   Layout();
  }

void DeletePanel()
  {
   ObjectsDeleteAll(0, OBJ_PREFIX);
  }

string Money(double v)
  {
   return(DoubleToString(v, 2) + " " + AccountCurrency());
  }

void UpdatePanel()
  {
   string cur = AccountCurrency();
   double riskMoney; string warn;
   double lot = CalcLot(riskMoney, warn);
   SetText(OBJ_PREFIX + "lot",
           "Lot " + (lot > 0 ? DoubleToString(lot, VolDigits(MarketInfo(Symbol(), MODE_LOTSTEP))) : "-") +
           "   Risk " + DoubleToString(riskMoney, 2) + " " + cur, clrWhite);
   if(g_msg != "" && TimeLocal() - g_msgAt < 10) SetText(OBJ_PREFIX + "warn", g_msg, C'255,170,60');
   else SetText(OBJ_PREFIX + "warn", warn, C'255,170,60');

   color txt = C'200,206,220';
   SetText(OBJ_PREFIX + "i_bal", "Balance: " + Money(AccountBalance()), txt);
   SetText(OBJ_PREFIX + "i_eq", "Equity: " + Money(AccountEquity()), txt);
   double pct = (g_dayBal > 0) ? g_pnl / g_dayBal * 100.0 : 0;
   SetText(OBJ_PREFIX + "i_pnl", "Today P/L: " + (g_pnl >= 0 ? "+" : "") + DoubleToString(g_pnl, 2) + " (" +
           (pct >= 0 ? "+" : "") + DoubleToString(pct, 2) + "%)", g_pnl >= 0 ? C'90,210,140' : C'240,100,110');
   SetText(OBJ_PREFIX + "i_risk", "Open risk: " + DoubleToString(g_openRisk, 2) + "%", txt);
   SetText(OBJ_PREFIX + "i_pos", "Open positions: " + IntegerToString(g_posCnt) + " / " + (MaxOpenTrades > 0 ? IntegerToString(MaxOpenTrades) : "-"), txt);
   SetText(OBJ_PREFIX + "i_day", "Trades today: " + IntegerToString(g_openedToday) + " / " + (MaxDailyTrades > 0 ? IntegerToString(MaxDailyTrades) : "-"), txt);
   if(g_lock == 1) SetText(OBJ_PREFIX + "i_lock", "LOCK: DAILY LOSS (until next day)", C'240,100,110');
   else if(g_lock == 2) SetText(OBJ_PREFIX + "i_lock", "LOCK: PROFIT TARGET (until next day)", C'255,170,60');
   else SetText(OBJ_PREFIX + "i_lock", "LOCK: none", C'90,210,140');
   ChartRedraw(0);
  }

void Say(string m)
  {
   g_msg = m; g_msgAt = TimeLocal();
   Print("Arion MM: ", m);
  }

//+------------------------------------------------------------------+
//| global variables: day state and per position memory              |
//+------------------------------------------------------------------+
void SaveDay()
  {
   GlobalVariableSet(GvName("DAYKEY"), (double)g_dayKey);
   GlobalVariableSet(GvName("DAYBAL"), g_dayBal);
   GlobalVariableSet(GvName("DAYLOCK"), (double)g_lock);
   GlobalVariableSet(GvName("DAYKILL"), (double)g_killed);
  }

double GvGet(string kind, int id)
  {
   string n = GvName(kind, id);
   return(GlobalVariableCheck(n) ? GlobalVariableGet(n) : 0.0);
  }

void GvSet(string kind, int id, double v) { GlobalVariableSet(GvName(kind, id), v); }

// forget memory of positions that are no longer open
void PruneGv(int &liveIds[])
  {
   if(TimeLocal() - g_lastPrune < 15) return;
   g_lastPrune = TimeLocal();
   string base = OBJ_PREFIX + IntegerToString(AccountNumber()) + "_";
   int bl = StringLen(base);
   for(int i = GlobalVariablesTotal() - 1; i >= 0; i--)
     {
      string n = GlobalVariableName(i);
      if(StringFind(n, base) != 0) continue;
      string rest = StringSubstr(n, bl);
      if(StringLen(rest) < 3 || StringGetChar(rest, 1) != '_') continue;   // D_123, P_123, N_123
      int id = (int)StringToInteger(StringSubstr(rest, 2));
      bool live = false;
      for(int k = 0; k < ArraySize(liveIds); k++) if(liveIds[k] == id) { live = true; break; }
      if(!live) GlobalVariableDel(n);
     }
  }

// a remainder after a partial close gets a new ticket: carry the memory over
void InheritMemory(int ticket, string comment)
  {
   int src = SplitSource(comment);
   if(src <= 0 || src == ticket) return;
   if(GvGet("D", ticket) <= 0 && GvGet("D", src) > 0) GvSet("D", ticket, GvGet("D", src));
   if(GvGet("P", ticket) < 0.5 && GvGet("P", src) > 0.5) GvSet("P", ticket, 1);
  }

void RefreshStats()
  {
   datetime now = TimeCurrent();
   datetime dayStart = (datetime)((now / 86400) * 86400);
   double closed = 0; int opened = 0;
   for(int i = OrdersHistoryTotal() - 1; i >= 0; i--)
     {
      if(!OrderSelect(i, SELECT_BY_POS, MODE_HISTORY)) continue;
      if(OrderCloseTime() < dayStart - 172800) break;
      if(OrderType() > OP_SELL) continue;
      if(OrderCloseTime() >= dayStart) closed += OrderProfit() + OrderSwap() + OrderCommission();
      if(OrderOpenTime() >= dayStart && StringFind(OrderComment(), "from #") < 0 && Managed(OrderSymbol(), OrderMagicNumber()))
         opened++;
     }
   for(int i = OrdersTotal() - 1; i >= 0; i--)
     {
      if(!OrderSelect(i, SELECT_BY_POS, MODE_TRADES)) continue;
      if(OrderType() > OP_SELL) continue;
      if(OrderOpenTime() >= dayStart && StringFind(OrderComment(), "from #") < 0 && Managed(OrderSymbol(), OrderMagicNumber()))
         opened++;
     }
   g_closed = closed; g_openedToday = opened; g_statsAt = TimeLocal(); g_statsDirty = false;
  }

void DayRoll()
  {
   long key = (long)(TimeCurrent() / 86400);
   if(key == g_dayKey) return;
   string kk = GvName("DAYKEY");
   if(GlobalVariableCheck(kk) && (long)GlobalVariableGet(kk) == key && GlobalVariableCheck(GvName("DAYBAL")))
     {
      g_dayBal = GlobalVariableGet(GvName("DAYBAL"));
      g_lock = (int)GvGet("DAYLOCK", 0);
      g_killed = (int)GvGet("DAYKILL", 0);
      g_dayKey = key;
      RefreshStats();
     }
   else
     {
      g_dayKey = key;
      RefreshStats();
      g_dayBal = AccountBalance() - g_closed;
      g_lock = 0; g_killed = 0; g_targetNoted = false;
      SaveDay();
      Print("Arion MM: new server day, start balance ", DoubleToString(g_dayBal, 2));
     }
  }

//+------------------------------------------------------------------+
//| trade actions                                                    |
//+------------------------------------------------------------------+
bool ClosePos(int ticket, string action, string detail)
  {
   if(!OrderSelect(ticket, SELECT_BY_TICKET) || OrderCloseTime() != 0) return(false);
   string sym = OrderSymbol();
   double price = (OrderType() == OP_BUY) ? MarketInfo(sym, MODE_BID) : MarketInfo(sym, MODE_ASK);
   if(OrderClose(ticket, OrderLots(), price, SlippagePoints, clrNONE))
     { Act(action, ticket, detail); g_statsDirty = true; return(true); }
   ActError(ticket, "close failed err=" + IntegerToString(GetLastError()));
   return(false);
  }

bool ModifySL(int ticket, double sl, string action, string detail)
  {
   if(!OrderSelect(ticket, SELECT_BY_TICKET) || OrderCloseTime() != 0) return(false);
   string sym = OrderSymbol();
   sl = NormalizeDouble(sl, (int)MarketInfo(sym, MODE_DIGITS));
   if(OrderModify(ticket, OrderOpenPrice(), sl, OrderTakeProfit(), 0, clrNONE))
     {
      if(action != "") Act(action, ticket, detail);
      return(true);
     }
   ActError(ticket, "modify failed err=" + IntegerToString(GetLastError()));
   return(false);
  }

bool PartialClose(int ticket, double vol, string action, string detail)
  {
   if(!OrderSelect(ticket, SELECT_BY_TICKET) || OrderCloseTime() != 0) return(false);
   string sym = OrderSymbol();
   double price = (OrderType() == OP_BUY) ? MarketInfo(sym, MODE_BID) : MarketInfo(sym, MODE_ASK);
   if(OrderClose(ticket, vol, price, SlippagePoints, clrNONE))
     { Act(action, ticket, detail); g_statsDirty = true; return(true); }
   ActError(ticket, "partial close failed err=" + IntegerToString(GetLastError()));
   return(false);
  }

// managed market positions oldest first; all open tickets plus split sources (for pruning)
int Gather(int &tk[], datetime &tm[], int &allIds[])
  {
   int total = OrdersTotal(), cnt = 0;
   ArrayResize(tk, 0); ArrayResize(tm, 0); ArrayResize(allIds, 0);
   for(int i = 0; i < total; i++)
     {
      if(!OrderSelect(i, SELECT_BY_POS, MODE_TRADES)) continue;
      if(OrderType() > OP_SELL) continue;
      int a = ArraySize(allIds);
      ArrayResize(allIds, a + 2);
      allIds[a] = OrderTicket();
      allIds[a + 1] = SplitSource(OrderComment());
      if(!Managed(OrderSymbol(), OrderMagicNumber())) continue;
      ArrayResize(tk, cnt + 1); ArrayResize(tm, cnt + 1);
      tk[cnt] = OrderTicket(); tm[cnt] = OrderOpenTime();
      cnt++;
     }
   for(int a = 1; a < cnt; a++)
     {
      int kt = tk[a]; datetime km = tm[a]; int b = a - 1;
      while(b >= 0 && tm[b] > km) { tk[b + 1] = tk[b]; tm[b + 1] = tm[b]; b--; }
      tk[b + 1] = kt; tm[b + 1] = km;
     }
   return(cnt);
  }

double OpenRiskPct(int &tk[], int cnt)
  {
   double bal = AccountBalance(), sum = 0;
   if(bal <= 0) return(0);
   for(int i = 0; i < cnt; i++)
     {
      if(!OrderSelect(tk[i], SELECT_BY_TICKET)) continue;
      double sl = OrderStopLoss();
      if(sl <= 0) continue;
      bool buy = (OrderType() == OP_BUY);
      double d = buy ? OrderOpenPrice() - sl : sl - OrderOpenPrice();
      if(d <= 0) continue;
      sum += d * MoneyPerUnit(OrderSymbol(), OrderLots());
     }
   return(sum / bal * 100.0);
  }

//+------------------------------------------------------------------+
//| rules                                                            |
//+------------------------------------------------------------------+
void DoRules()
  {
   DayRoll();
   if(g_statsDirty || TimeLocal() - g_statsAt >= 3) RefreshStats();

   int tk[]; datetime tm[]; int allIds[];
   int cnt = Gather(tk, tm, allIds);
   PruneGv(allIds);
   g_posCnt = cnt;
   g_openRisk = OpenRiskPct(tk, cnt);
   g_pnl = g_closed + AccountProfit();
   double balance = AccountBalance();

   // daily loss lock / profit target
   if(g_lock == 0 && g_dayBal > 0)
     {
      if(MaxDailyLossPct > 0 && g_pnl <= -MaxDailyLossPct / 100.0 * g_dayBal)
        {
         g_lock = 1; SaveDay();
         Act("lock_loss", 0, "day P/L " + DoubleToString(g_pnl, 2) + " limit -" + DoubleToString(MaxDailyLossPct, 2) + "%");
        }
      else if(DailyProfitTargetPct > 0 && g_pnl >= DailyProfitTargetPct / 100.0 * g_dayBal)
        {
         if(LockOnTarget)
           {
            g_lock = 2; SaveDay();
            Act("lock_target", 0, "day P/L " + DoubleToString(g_pnl, 2) + " target " + DoubleToString(DailyProfitTargetPct, 2) + "%");
           }
         else if(!g_targetNoted)
           {
            g_targetNoted = true;
            Act("target_reached", 0, "day P/L " + DoubleToString(g_pnl, 2) + " (no lock)");
           }
        }
     }

   if(!IsTradeAllowed())
     {
      if(cnt > 0 || g_lock > 0) ActError(0, "trading not allowed (enable AutoTrading)");
      return;
     }

   if(g_lock > 0)
     {
      for(int i = cnt - 1; i >= 0; i--) ClosePos(tk[i], "close_locked", g_lock == 1 ? "daily loss lock" : "daily target lock");
      return;
     }

   bool gone[]; ArrayResize(gone, cnt);
   for(int i = 0; i < cnt; i++) gone[i] = false;

   // max open positions: newest closed first
   if(MaxOpenTrades > 0)
     {
      int live = cnt;
      for(int i = cnt - 1; i >= 0 && live > MaxOpenTrades; i--)
         if(ClosePos(tk[i], "close_maxopen", "max open " + IntegerToString(MaxOpenTrades))) { gone[i] = true; live--; }
     }
   // max trades per day
   if(MaxDailyTrades > 0)
     {
      datetime dayStart = (datetime)(g_dayKey * 86400);
      int excess = (g_openedToday - g_killed) - MaxDailyTrades;
      for(int i = cnt - 1; i >= 0 && excess > 0; i--)
        {
         if(gone[i] || tm[i] < dayStart) continue;
         if(ClosePos(tk[i], "close_maxdaily", "max daily " + IntegerToString(MaxDailyTrades)))
           { gone[i] = true; excess--; g_killed++; SaveDay(); }
        }
     }

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
      InheritMemory(t, OrderComment());

      // 1) required stop loss
      if(sl <= 0 && RequireSL)
        {
         bool fixedSl = false;
         if(AutoSLPips > 0)
           {
            double dist0 = AutoSLPips * PipSize(sym);
            double minD = (MinStopPoints(sym) + 2) * pt;
            double cur0 = buy ? MarketInfo(sym, MODE_BID) : MarketInfo(sym, MODE_ASK);
            double slPx = buy ? open - dist0 : open + dist0;
            if(buy && slPx > cur0 - minD) slPx = cur0 - minD;
            if(!buy && slPx < cur0 + minD) slPx = cur0 + minD;
            slPx = NormalizeDouble(slPx, digits);
            if(slPx > 0 && ModifySL(t, slPx, "sl_set", "auto SL " + DoubleToString(slPx, digits)))
              { fixedSl = true; sl = slPx; }
           }
         if(!fixedSl)
           {
            double since = GvGet("N", t);
            if(since <= 0) { since = (double)TimeLocal(); GvSet("N", t, since); }
            if((double)TimeLocal() - since >= SLGraceSec)
              {
               if(ClosePos(t, "close_nosl", "no SL after " + IntegerToString(SLGraceSec) + "s")) continue;
              }
            continue;
           }
        }
      if(!OrderSelect(t, SELECT_BY_TICKET) || OrderCloseTime() != 0) continue;
      sl = OrderStopLoss();
      if(sl <= 0) continue;
      string nk = GvName("N", t);
      if(GlobalVariableCheck(nk)) GlobalVariableDel(nk);

      // initial risk distance (base of R)
      if(GvGet("D", t) <= 0)
        {
         double d0 = buy ? open - sl : sl - open;
         if(d0 > 0) GvSet("D", t, d0);
        }

      // 2) max risk per position: close the extra volume (remainder gets a new ticket)
      if(MaxRiskPerTradePct > 0 && balance > 0)
        {
         double riskDist = buy ? open - sl : sl - open;
         double perUnit = MoneyPerUnit(sym, vol);
         double risk = riskDist > 0 ? riskDist * perUnit : 0;
         double limit = balance * MaxRiskPerTradePct / 100.0;
         if(risk > limit * 1.02 && perUnit > 0)
           {
            double step = MarketInfo(sym, MODE_LOTSTEP);
            double minV = MarketInfo(sym, MODE_MINLOT);
            if(step <= 0) step = minV;
            double newVol = MathFloor(vol * limit / risk / step + 1e-9) * step;
            if(newVol < minV)
              {
               if(ClosePos(t, "close_risk", "risk " + DoubleToString(risk, 2) + " > limit " + DoubleToString(limit, 2))) continue;
              }
            else
              {
               double cv = NormalizeDouble(vol - newVol, 8);
               if(cv >= minV)
                 {
                  PartialClose(t, cv, "partial_risk", "closed " + DoubleToString(cv, 2) + " lot, left " + DoubleToString(newVol, 2));
                  continue;   // ticket changed, the remainder is handled on the next run
                 }
              }
           }
        }

      // 3) partial close, break even, trailing (R based)
      double dist = GvGet("D", t);
      if(dist <= 0) continue;
      if(!OrderSelect(t, SELECT_BY_TICKET) || OrderCloseTime() != 0) continue;
      sl = OrderStopLoss();
      double cur = buy ? MarketInfo(sym, MODE_BID) : MarketInfo(sym, MODE_ASK);
      double prof = buy ? cur - open : open - cur;

      if(PartialCloseAtR > 0 && PartialClosePct > 0 && prof >= PartialCloseAtR * dist && GvGet("P", t) < 0.5)
        {
         double step2 = MarketInfo(sym, MODE_LOTSTEP);
         double minV2 = MarketInfo(sym, MODE_MINLOT);
         if(step2 <= 0) step2 = minV2;
         double cv2 = MathFloor(vol * MathMin(PartialClosePct, 100.0) / 100.0 / step2 + 1e-9) * step2;
         cv2 = NormalizeDouble(cv2, 8);
         if(cv2 < minV2 || vol - cv2 < minV2 - 1e-9)
           {
            GvSet("P", t, 1);   // too small to split, do not retry
            Act("partial_skip", t, "volume too small to split");
           }
         else
           {
            GvSet("P", t, 1);   // set first so the remainder inherits it
            if(PartialClose(t, cv2, "partial_r", "closed " + DoubleToString(cv2, 2) + " lot at " + DoubleToString(PartialCloseAtR, 2) + "R"))
               continue;       // remainder has a new ticket, handled on the next run
            GlobalVariableDel(GvName("P", t));
           }
        }

      if(BreakEvenAtR > 0 && prof >= BreakEvenAtR * dist)
        {
         double target = NormalizeDouble(buy ? open + BEOffsetPoints * pt : open - BEOffsetPoints * pt, digits);
         bool need = buy ? (sl < target - pt * 0.5) : (sl > target + pt * 0.5);
         if(need && StopsOk(sym, buy, target))
           {
            if(ModifySL(t, target, "breakeven", "SL to " + DoubleToString(target, digits))) sl = target;
           }
        }
      if(TrailingStartR > 0 && TrailingDistR > 0 && prof >= TrailingStartR * dist)
        {
         double nsl = NormalizeDouble(buy ? cur - TrailingDistR * dist : cur + TrailingDistR * dist, digits);
         double minGain = MathMax(pt * 5, 0.05 * dist);
         bool better = buy ? (nsl > sl + minGain) : (sl <= 0 || nsl < sl - minGain);
         if(better && StopsOk(sym, buy, nsl))
            ModifySL(t, nsl, "trail", "SL to " + DoubleToString(nsl, digits));
        }
     }
  }

void RunRules(bool force)
  {
   if(g_busy) return;
   uint nowMs = GetTickCount();
   if(!force && nowMs - g_lastRun < 1000) return;
   g_lastRun = nowMs;
   g_busy = true;
   DoRules();
   g_busy = false;
   UpdatePanel();
  }

//+------------------------------------------------------------------+
//| panel buttons                                                    |
//+------------------------------------------------------------------+
void OpenOrder(bool buy)
  {
   string sym = Symbol();
   RunRules(true);
   if(g_lock > 0) { Say("Locked until next server day"); return; }
   if(!IsTradeAllowed()) { Say("Enable AutoTrading"); return; }
   if(MaxOpenTrades > 0 && g_posCnt >= MaxOpenTrades) { Say("Max open trades reached"); return; }
   if(MaxDailyTrades > 0 && g_openedToday >= MaxDailyTrades) { Say("Max daily trades reached"); return; }
   double riskMoney; string warn;
   double lot = CalcLot(riskMoney, warn);
   if(lot <= 0) { Say(warn == "" ? "Lot is zero" : warn); return; }
   double slDist = g_slPips * PipSize(sym);
   double pt = MarketInfo(sym, MODE_POINT);
   int digits = (int)MarketInfo(sym, MODE_DIGITS);
   if(slDist < MinStopPoints(sym) * pt) { Say("SL is closer than broker minimum"); return; }
   double tpDist = TpDistance();
   if(tpDist > 0 && tpDist < MinStopPoints(sym) * pt) { Say("TP is closer than broker minimum"); return; }
   int cmd = buy ? OP_BUY : OP_SELL;
   double price = buy ? MarketInfo(sym, MODE_ASK) : MarketInfo(sym, MODE_BID);
   if(price <= 0) { Say("No price"); return; }
   ResetLastError();
   if(AccountFreeMarginCheck(sym, cmd, lot) <= 0 || GetLastError() == 134) { Say("Not enough free margin"); return; }
   double sl = NormalizeDouble(buy ? price - slDist : price + slDist, digits);
   double tp = tpDist > 0 ? NormalizeDouble(buy ? price + tpDist : price - tpDist, digits) : 0;
   int ticket = OrderSend(sym, cmd, lot, NormalizeDouble(price, digits), SlippagePoints, sl, tp, "Arion MM", MagicNumber, 0, clrNONE);
   if(ticket > 0)
     {
      Act(buy ? "buy" : "sell", ticket, DoubleToString(lot, 2) + " lot " + sym + " SL " + DoubleToString(sl, digits) +
          " TP " + (tp > 0 ? DoubleToString(tp, digits) : "-") + " risk " + DoubleToString(riskMoney, 2));
      Say((buy ? "BUY " : "SELL ") + DoubleToString(lot, 2) + " placed");
      g_statsDirty = true;
     }
   else
     {
      Say("Order failed err=" + IntegerToString(GetLastError()));
     }
   RunRules(true);
  }

void CloseAllManaged()
  {
   int tk[]; datetime tm[]; int ids[];
   int cnt = Gather(tk, tm, ids);
   int n = 0;
   for(int i = cnt - 1; i >= 0; i--) if(ClosePos(tk[i], "close_all", "panel button")) n++;
   Say("Closed " + IntegerToString(n) + " of " + IntegerToString(cnt));
  }

void BreakevenAll()
  {
   int tk[]; datetime tm[]; int ids[];
   int cnt = Gather(tk, tm, ids);
   int n = 0;
   for(int i = 0; i < cnt; i++)
     {
      if(!OrderSelect(tk[i], SELECT_BY_TICKET)) continue;
      string sym = OrderSymbol();
      bool buy = (OrderType() == OP_BUY);
      double pt = MarketInfo(sym, MODE_POINT);
      double open = OrderOpenPrice();
      double sl = OrderStopLoss();
      int digits = (int)MarketInfo(sym, MODE_DIGITS);
      double target = NormalizeDouble(buy ? open + BEOffsetPoints * pt : open - BEOffsetPoints * pt, digits);
      bool need = buy ? (sl <= 0 || sl < target - pt * 0.5) : (sl <= 0 || sl > target + pt * 0.5);
      if(need && StopsOk(sym, buy, target))
         if(ModifySL(tk[i], target, "breakeven", "panel button, SL to " + DoubleToString(target, digits))) n++;
     }
   Say("Breakeven set on " + IntegerToString(n) + " positions");
  }

double ReadNum(string objName, double fallback)
  {
   string s = ObjectGetString(0, objName, OBJPROP_TEXT);
   StringReplace(s, ",", ".");
   double v = StringToDouble(s);
   if(v < 0) return(fallback);
   return(v);
  }

//+------------------------------------------------------------------+
//| events                                                           |
//+------------------------------------------------------------------+
int OnInit()
  {
   g_risk = DefaultRiskPct; g_slPips = DefaultSLPips; g_tp = DefaultTP;
   g_dayKey = -1; g_statsDirty = true;
   BuildPanel();
   EventSetTimer(1);
   Print("Arion Money Manager 1.00 started on ", Symbol(), ", account ", IntegerToString(AccountNumber()));
   RunRules(true);
   return(INIT_SUCCEEDED);
  }

void OnDeinit(const int reason)
  {
   EventKillTimer();
   DeletePanel();
   ChartRedraw(0);
  }

void OnTimer() { RunRules(false); }

void OnTick() { RunRules(false); }

void OnChartEvent(const int id, const long &lparam, const double &dparam, const string &sparam)
  {
   if(id == CHARTEVENT_CHART_CHANGE)
     {
      int w = (int)ChartGetInteger(0, CHART_WIDTH_IN_PIXELS), h = (int)ChartGetInteger(0, CHART_HEIGHT_IN_PIXELS);
      if(w != g_lastW || h != g_lastH) { Layout(); ChartRedraw(0); }
      return;
     }
   if(id == CHARTEVENT_OBJECT_ENDEDIT)
     {
      if(sparam == OBJ_PREFIX + "e_risk") g_risk = ReadNum(sparam, g_risk);
      else if(sparam == OBJ_PREFIX + "e_sl") g_slPips = ReadNum(sparam, g_slPips);
      else if(sparam == OBJ_PREFIX + "e_tp") g_tp = ReadNum(sparam, g_tp);
      else return;
      ObjectSetString(0, OBJ_PREFIX + "e_risk", OBJPROP_TEXT, DoubleToString(g_risk, 2));
      ObjectSetString(0, OBJ_PREFIX + "e_sl", OBJPROP_TEXT, DoubleToString(g_slPips, 1));
      ObjectSetString(0, OBJ_PREFIX + "e_tp", OBJPROP_TEXT, DoubleToString(g_tp, 2));
      UpdatePanel();
      return;
     }
   if(id == CHARTEVENT_OBJECT_CLICK)
     {
      bool handled = true;
      if(sparam == OBJ_PREFIX + "b_buy") OpenOrder(true);
      else if(sparam == OBJ_PREFIX + "b_sell") OpenOrder(false);
      else if(sparam == OBJ_PREFIX + "b_close") CloseAllManaged();
      else if(sparam == OBJ_PREFIX + "b_be") BreakevenAll();
      else handled = false;
      if(handled)
        {
         ObjectSetInteger(0, sparam, OBJPROP_STATE, false);
         UpdatePanel();
        }
     }
  }
//+------------------------------------------------------------------+
