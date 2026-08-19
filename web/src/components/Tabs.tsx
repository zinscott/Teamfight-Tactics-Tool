export type TabKey = "items" | "builds";

const TABS: { key: TabKey; label: string }[] = [
  { key: "items", label: "Items" },
  { key: "builds", label: "Builds" },
];

export function Tabs({
  active,
  onChange,
}: {
  active: TabKey;
  onChange: (tab: TabKey) => void;
}) {
  return (
    <div className="flex gap-6 border-b border-hairline">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          className={`border-b-2 pb-2.5 text-xl font-medium ${
            active === tab.key
              ? "border-gold text-gold"
              : "border-transparent text-text-mute hover:text-text-soft"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
