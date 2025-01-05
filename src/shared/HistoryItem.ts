export interface HistoryItem {
  id: string;
  ts: number;
  task: string;
  tokensIn: number;
  tokensOut: number;
  cacheWrites?: number;
  cacheReads?: number;
  totalCost: number;
}
