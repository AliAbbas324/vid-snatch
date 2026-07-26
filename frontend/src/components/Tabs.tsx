interface Tab {
  key: string;
  label: string;
}

interface Props {
  tabs: Tab[];
  active: string;
  onChange: (key: string) => void;
}

export function Tabs({ tabs, active, onChange }: Props) {
  return (
    <div className="inline-flex w-fit gap-1 rounded-md bg-surface-muted p-1">
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          onClick={() => onChange(t.key)}
          className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
            active === t.key
              ? "border border-border bg-surface text-ink"
              : "border border-transparent text-ink-muted hover:text-ink"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
