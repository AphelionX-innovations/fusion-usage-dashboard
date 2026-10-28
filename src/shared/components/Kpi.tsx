import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const TONE_BORDER = {
  good: "border-t-primary",
  warn: "border-t-destructive",
  workflow: "border-t-workflow",
  agent: "border-t-agent",
} as const;

export function Kpi(props: {
  label: string;
  value: string;
  detail: string;
  badge?: string;
  tone?: keyof typeof TONE_BORDER;
}) {
  return (
    <Card className={cn("gap-2 border-t-2 py-4 ring-0", props.tone ? TONE_BORDER[props.tone] : "border-t-border")}>
      <CardContent className="grid gap-2">
        <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">{props.label}</span>
        <div className="flex items-baseline gap-2">
          <strong className="font-mono text-3xl leading-none font-semibold tracking-tight">{props.value}</strong>
          {props.badge ? (
            <em
              className={cn(
                "font-mono text-sm font-medium not-italic",
                props.tone === "warn" && "text-destructive",
                props.tone === "good" && "text-success",
                props.tone === "workflow" && "text-workflow",
                props.tone === "agent" && "text-agent",
              )}
            >
              {props.badge}
            </em>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">{props.detail}</p>
      </CardContent>
    </Card>
  );
}
