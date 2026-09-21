import { Sparkle, Storefront, MusicNotes, Shield } from "../icons";

type Tab = "create" | "shop" | "playlists" | "admin";

const TABS: { key: Tab; icon: typeof Sparkle; label: string }[] = [
  { key: "create", icon: Sparkle, label: "Создать" },
  { key: "shop", icon: Storefront, label: "Подписка" },
  { key: "playlists", icon: MusicNotes, label: "Музыка" },
];

export function BottomNav({
  tab,
  isAdmin,
  onTab,
}: {
  tab: Tab | null;
  isAdmin: boolean;
  onTab: (tab: Tab) => void;
}) {
  const tabs = isAdmin
    ? [...TABS, { key: "admin" as const, icon: Shield, label: "Админ" }]
    : TABS;

  return (
    <nav className="dock" aria-label="Главное меню">
      <div className="dock-inner">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              type="button"
              className={`dock-tab${tab === t.key ? " active" : ""}`}
              aria-current={tab === t.key ? "page" : undefined}
              onClick={() => onTab(t.key)}
            >
              <span className="dock-tab-icon" aria-hidden="true">
                <Icon
                  size={22}
                  weight={tab === t.key ? "fill" : "bold"}
                  fill={tab === t.key ? "currentColor" : "none"}
                />
              </span>
              <span className="dock-tab-label">{t.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
