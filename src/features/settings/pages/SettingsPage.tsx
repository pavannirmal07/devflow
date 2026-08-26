import { Monitor, Sun, Moon, Palette } from "lucide-react";
import { useTheme, type ThemeMode } from "@/features/theme";
import "../settings.css";

interface ThemeOption {
  id: ThemeMode;
  label: string;
  description: string;
  icon: typeof Monitor;
}

const THEME_OPTIONS: ThemeOption[] = [
  {
    id: "system",
    label: "System",
    description: "Follows your operating system's light or dark mode setting automatically.",
    icon: Monitor,
  },
  {
    id: "light",
    label: "Light",
    description: "Clean, high-contrast light theme optimized for well-lit environments.",
    icon: Sun,
  },
  {
    id: "dark",
    label: "Dark",
    description: "Sleek, low-glare dark theme optimized for low-light environments.",
    icon: Moon,
  },
];

export function SettingsPage() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="devflow-settings-page">
      {/* Page Subtitle Header */}
      <header className="devflow-settings-header">
        <p className="devflow-settings-subtitle">
          Manage your application preferences and appearance settings.
        </p>
      </header>

      {/* Appearance Section */}
      <section className="devflow-settings-section" aria-labelledby="appearance-heading">
        <div className="devflow-settings-section-header">
          <h2 id="appearance-heading" className="devflow-settings-section-title">
            <Palette className="size-4 text-accent shrink-0" />
            <span>Appearance</span>
          </h2>
          <p className="devflow-settings-section-desc">
            Choose how DevFlow should look. Changes apply immediately and are saved to this browser.
          </p>
        </div>

        <div className="devflow-theme-options-grid" role="radiogroup" aria-label="Theme Mode Selection">
          {THEME_OPTIONS.map((option) => {
            const isSelected = theme === option.id;
            const Icon = option.icon;

            return (
              <div
                key={option.id}
                role="radio"
                aria-checked={isSelected}
                tabIndex={0}
                className={`devflow-theme-option-card ${isSelected ? "is-selected" : ""}`}
                onClick={() => setTheme(option.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setTheme(option.id);
                  }
                }}
              >
                <div className="devflow-theme-card-top">
                  <div className="devflow-theme-icon-box">
                    <Icon className="size-5 shrink-0" />
                  </div>
                  <div className="devflow-theme-radio-indicator">
                    {isSelected && <div className="devflow-theme-radio-dot" />}
                  </div>
                </div>

                <div className="devflow-theme-card-content">
                  <h3 className="devflow-theme-card-title">
                    <span>{option.label}</span>
                    {isSelected && (
                      <span className="devflow-theme-active-badge">Active</span>
                    )}
                  </h3>
                  <p className="devflow-theme-card-desc">{option.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
