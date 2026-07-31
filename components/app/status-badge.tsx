import * as React from "react";

import { cn } from "@/lib/utils";

type StatusBadgeTone =
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "destructive";

type StatusBadgeProps = React.ComponentPropsWithoutRef<"span"> & {
  children: React.ReactNode;
  tone?: StatusBadgeTone;
};

const toneStyles: Record<StatusBadgeTone, string> = {
  neutral: "border-border bg-muted text-muted-foreground",
  info: "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-800 dark:bg-sky-950/50 dark:text-sky-200",
  success:
    "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200",
  warning:
    "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200",
  destructive:
    "border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/50 dark:text-red-200",
};

function StatusBadge({
  tone = "neutral",
  className,
  ...props
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center rounded-full border px-2 py-0.5 text-xs font-medium leading-5",
        toneStyles[tone],
        className
      )}
      {...props}
    />
  );
}

export { StatusBadge, type StatusBadgeProps, type StatusBadgeTone };
