import * as React from "react";
import {
  CircleAlert,
  CircleCheck,
  Info,
  TriangleAlert,
} from "lucide-react";

import { cn } from "@/lib/utils";

type FeedbackAlertVariant = "info" | "success" | "warning" | "error";

type FeedbackAlertProps = Omit<
  React.ComponentPropsWithoutRef<"div">,
  "title"
> & {
  title?: React.ReactNode;
  children: React.ReactNode;
  variant: FeedbackAlertVariant;
};

const variants = {
  info: {
    icon: Info,
    styles:
      "border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-800 dark:bg-sky-950/50 dark:text-sky-100",
  },
  success: {
    icon: CircleCheck,
    styles:
      "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-100",
  },
  warning: {
    icon: TriangleAlert,
    styles:
      "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-100",
  },
  error: {
    icon: CircleAlert,
    styles:
      "border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950/50 dark:text-red-100",
  },
} satisfies Record<
  FeedbackAlertVariant,
  { icon: React.ComponentType<{ className?: string }>; styles: string }
>;

function FeedbackAlert({
  title,
  variant,
  children,
  className,
  ...props
}: FeedbackAlertProps) {
  const config = variants[variant];
  const Icon = config.icon;
  const isError = variant === "error";

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border p-3 text-sm",
        config.styles,
        className
      )}
      {...props}
      role={isError ? "alert" : "status"}
      aria-live={isError ? "assertive" : "polite"}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0">
        {title ? <p className="font-medium leading-5">{title}</p> : null}
        <div className={cn("leading-5", title && "mt-1")}>{children}</div>
      </div>
    </div>
  );
}

export {
  FeedbackAlert,
  type FeedbackAlertProps,
  type FeedbackAlertVariant,
};
