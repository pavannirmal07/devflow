import { useState } from "react";
import { Clock, Calendar, CheckSquare, Zap, Target, Check, SlidersHorizontal, AlertCircle } from "lucide-react";
import { formatDuration } from "../../tasks/utils/duration";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { DashboardMetrics } from "../types";

export interface DashboardVelocityCardsProps {
  metrics: DashboardMetrics;
  onUpdateFocusGoal?: (seconds: number) => void;
}

const PRESET_GOALS = [
  { label: "1h", seconds: 1 * 3600 },
  { label: "2h", seconds: 2 * 3600 },
  { label: "4h", seconds: 4 * 3600 },
  { label: "6h", seconds: 6 * 3600 },
  { label: "8h", seconds: 8 * 3600 },
];

export function DashboardVelocityCards({
  metrics,
  onUpdateFocusGoal,
}: DashboardVelocityCardsProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [customHours, setCustomHours] = useState(() =>
    Math.floor(metrics.dailyFocusGoalSeconds / 3600)
  );
  const [customMinutes, setCustomMinutes] = useState(() =>
    Math.floor((metrics.dailyFocusGoalSeconds % 3600) / 60)
  );

  const goalPercent = metrics.dailyFocusGoalSeconds > 0
    ? Math.min(100, Math.round((metrics.todayFocusSeconds / metrics.dailyFocusGoalSeconds) * 100))
    : 0;

  const isPresetActive = (seconds: number) =>
    metrics.dailyFocusGoalSeconds === seconds;

  const handleSelectPreset = (seconds: number) => {
    if (onUpdateFocusGoal) {
      onUpdateFocusGoal(seconds);
    }
    setShowCustom(false);
    setPopoverOpen(false);
  };

  const handleApplyCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const h = Math.max(0, Math.min(23, Number(customHours) || 0));
    const m = Math.max(0, Math.min(59, Number(customMinutes) || 0));
    const totalSec = h * 3600 + m * 60;
    if (totalSec >= 60 && onUpdateFocusGoal) {
      onUpdateFocusGoal(totalSec);
    }
    setPopoverOpen(false);
  };

  return (
    <div className="devflow-dashboard-metrics-grid">
      {/* 1. Focus Today */}
      <div className="devflow-dashboard-metric-card">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-[11px] font-semibold uppercase tracking-wider">
            Today's Focus Time
          </span>
          <Clock className="size-4 text-accent" />
        </div>

        <div className="flex items-center gap-2 flex-wrap mt-1">
          <span className="text-xl font-bold font-mono text-foreground">
            {formatDuration(metrics.todayFocusSeconds)}
          </span>
          <span className="text-xs text-muted-foreground font-mono">
            / {formatDuration(metrics.dailyFocusGoalSeconds)} target
          </span>

          {onUpdateFocusGoal && (
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="devflow-dashboard-goal-btn ml-0.5"
                  title="Set daily focus target"
                  aria-label="Set daily focus target"
                >
                  <Target className="size-3.5" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-3.5 space-y-3" align="start">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-semibold text-foreground">
                      Set Daily Focus Target
                    </h4>
                    <p className="text-[11px] text-muted-foreground">
                      Configure your daily target deep work time.
                    </p>
                  </div>
                </div>

                {/* Preset Choices */}
                <div className="grid grid-cols-5 gap-1">
                  {PRESET_GOALS.map((preset) => {
                    const active = isPresetActive(preset.seconds);
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => handleSelectPreset(preset.seconds)}
                        className={`h-7 text-xs font-medium rounded-md border transition-all flex items-center justify-center ${
                          active
                            ? "bg-accent text-accent-foreground border-accent font-semibold"
                            : "bg-background border-border text-foreground hover:border-accent/60 hover:bg-accent/5"
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>

                {/* Custom Target Toggle / Form */}
                {!showCustom ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() => {
                      setCustomHours(Math.floor(metrics.dailyFocusGoalSeconds / 3600));
                      setCustomMinutes(Math.floor((metrics.dailyFocusGoalSeconds % 3600) / 60));
                      setShowCustom(true);
                    }}
                    className="w-full text-xs text-muted-foreground hover:text-foreground gap-1.5 h-7"
                  >
                    <SlidersHorizontal className="size-3" />
                    <span>Custom Target...</span>
                  </Button>
                ) : (
                  <form onSubmit={handleApplyCustom} className="space-y-2.5 pt-1 border-t border-border">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[10.5px] text-muted-foreground">Hours</Label>
                        <Input
                          type="number"
                          min="0"
                          max="23"
                          value={customHours}
                          onChange={(e) => setCustomHours(Math.max(0, parseInt(e.target.value) || 0))}
                          className="h-7 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10.5px] text-muted-foreground">Minutes</Label>
                        <Input
                          type="number"
                          min="0"
                          max="59"
                          step="5"
                          value={customMinutes}
                          onChange={(e) => setCustomMinutes(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                          className="h-7 text-xs"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        onClick={() => setShowCustom(false)}
                        className="h-6 text-[11px] px-2"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        size="xs"
                        className="devflow-btn-primary h-6 text-[11px] px-2.5"
                      >
                        <Check className="size-3 mr-1" />
                        Apply
                      </Button>
                    </div>
                  </form>
                )}
              </PopoverContent>
            </Popover>
          )}
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-border/70 rounded-full h-1.5 mt-2 overflow-hidden">
          <div
            className="bg-accent h-full rounded-full transition-all duration-300"
            style={{ width: `${goalPercent}%` }}
          />
        </div>
      </div>

      {/* 2. Focus This Week */}
      <div className="devflow-dashboard-metric-card">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-[11px] font-semibold uppercase tracking-wider">
            Focus This Week
          </span>
          <Calendar className="size-4 text-accent" />
        </div>

        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-xl font-bold font-mono text-foreground">
            {formatDuration(metrics.weekFocusSeconds)}
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">
          Total time across all focus sessions this week
        </p>
      </div>

      {/* 3. Tasks Completed Today */}
      <div className="devflow-dashboard-metric-card">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-[11px] font-semibold uppercase tracking-wider">
            Tasks Completed
          </span>
          <CheckSquare className="size-4 text-emerald-500" />
        </div>

        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-xl font-bold font-mono text-foreground">
            {metrics.todayCompletedTasksCount}
          </span>
          <span className="text-xs text-muted-foreground">
            today ({metrics.activeTasksCount} active)
          </span>
        </div>
        <div className="mt-2 flex items-center min-h-5.5">
          {metrics.overdueTasksCount > 0 ? (
            <span className="devflow-task-due-date is-overdue text-[10.5px] py-0.5 px-1.5">
              <AlertCircle className="size-3 text-destructive shrink-0" />
              <span>{metrics.overdueTasksCount} task{metrics.overdueTasksCount === 1 ? "" : "s"} overdue</span>
            </span>
          ) : (
            <span className="text-[11px] text-muted-foreground">
              0 overdue tasks
            </span>
          )}
        </div>
      </div>

      {/* 4. Focus Sessions Completed */}
      <div className="devflow-dashboard-metric-card">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-[11px] font-semibold uppercase tracking-wider">
            Sessions Logged
          </span>
          <Zap className="size-4 text-amber-500" />
        </div>

        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-xl font-bold font-mono text-foreground">
            {metrics.todayCompletedSessionsCount}
          </span>
          <span className="text-xs text-muted-foreground">
            session{metrics.todayCompletedSessionsCount === 1 ? "" : "s"} today
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">
          Active streak & consistent deep work
        </p>
      </div>
    </div>
  );
}
