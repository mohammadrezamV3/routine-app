export type TradeEntry = {
  id: string;
  pair: string;
  direction: "long" | "short";
  entryPrice: number;
  exitPrice: number | null;
  lotSize: number;
  pnl: number | null;
  riskPercent: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  strategy: string | null;
  screenshotUrl: string | null;
  openedAt: string;
  notes: string | null;
};
