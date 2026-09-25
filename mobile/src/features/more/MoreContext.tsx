import { createContext, ReactNode, useContext } from "react";

export interface PlanModule {
  key: string;
  label: string;
  /** ISO — null یعنی بی‌انقضا (پلنِ پایه یا سوپریوزر) */
  expiresAt: string | null;
}

export interface MoreContextType {
  // User info
  userName: string | null;
  userUsername: string | null;
  userPhone: string | null;

  // Plan & modules
  planName: string | null;
  planStatus: "ACTIVE" | "TRIAL" | null;
  /** ISO — پایانِ دوره‌ی فعلیِ اشتراک */
  planExpiresAt: string | null;
  modules: PlanModule[];

  // Sync
  lastSyncTime: string | null;
  onSync: () => void;
  isSyncing: boolean;

  // Data clear
  onClearData: () => void;

  // Auth
  isLoggedIn: boolean;
  onLogout: () => void;

  // Notifications
  notificationsEnabled: boolean;
  onNotificationsToggle: (enabled: boolean) => void;
}

const defaultContext: MoreContextType = {
  userName: null,
  userUsername: null,
  userPhone: null,
  planName: null,
  planStatus: null,
  planExpiresAt: null,
  modules: [],
  lastSyncTime: null,
  onSync: () => {},
  isSyncing: false,
  onClearData: () => {},
  isLoggedIn: false,
  onLogout: () => {},
  notificationsEnabled: false,
  onNotificationsToggle: () => {},
};

export const MoreContext = createContext<MoreContextType>(defaultContext);

export function useMoreContext() {
  return useContext(MoreContext);
}

export function MoreProvider({ children, value }: { children: ReactNode; value?: Partial<MoreContextType> }) {
  const contextValue = { ...defaultContext, ...value };
  return <MoreContext.Provider value={contextValue}>{children}</MoreContext.Provider>;
}
