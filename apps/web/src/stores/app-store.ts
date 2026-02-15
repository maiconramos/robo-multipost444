import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_LOCALE, resolveLocale, type AppLocale } from "@/lib/i18n";

interface AppState {
  // User preferences
  timezone: string;
  defaultProfileId: string | null;
  language: AppLocale;

  // UI state
  sidebarOpen: boolean;

  // Actions
  setTimezone: (timezone: string) => void;
  setDefaultProfileId: (profileId: string | null) => void;
  setLanguage: (language: AppLocale) => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      defaultProfileId: null,
      language: DEFAULT_LOCALE,
      sidebarOpen: true,

      setTimezone: (timezone) => set({ timezone }),
      setDefaultProfileId: (profileId) => set({ defaultProfileId: profileId }),
      setLanguage: (language) => set({ language: resolveLocale(language) }),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
    }),
    {
      name: "robo-multipost-app",
      partialize: (state) => ({
        timezone: state.timezone,
        defaultProfileId: state.defaultProfileId,
        language: state.language,
      }),
      merge: (persistedState, currentState) => {
        const persisted = (persistedState as Partial<AppState>) || {};

        return {
          ...currentState,
          ...persisted,
          language: resolveLocale(persisted.language),
        };
      },
    }
  )
);
