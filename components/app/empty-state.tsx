import * as React from "react";

import { cn } from "@/lib/utils";

type EmptyStateVariant = "compact" | "panel";

type EmptyStateProps = Omit<
  React.ComponentPropsWithoutRef<"div">,
  "title"
> & {
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  primaryAction?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  variant?: EmptyStateVariant;
};

function EmptyState({
  title,
  description,
  icon,
  primaryAction,
  secondaryAction,
  variant = "compact",
  className,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  ...props
}: EmptyStateProps) {
  const generatedTitleId = React.useId();
  const titleId = ariaLabelledBy ?? generatedTitleId;
  const hasActions = primaryAction || secondaryAction;

  return (
    <div
      className={cn(
        "flex flex-col items-center text-center",
        variant === "compact"
          ? "gap-3 py-4"
          : "gap-4 rounded-xl border bg-card px-5 py-8 shadow-sm sm:px-8 sm:py-10",
        className
      )}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabel ? ariaLabelledBy : titleId}
      {...props}
    >
      {icon ? (
        <div
          className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground [&_svg]:size-5"
          aria-hidden="true"
        >
          {icon}
        </div>
      ) : null}

      <div className="max-w-md space-y-1.5">
        <h3 id={titleId} className="font-semibold tracking-tight text-foreground">
          {title}
        </h3>
        {description ? (
          <div className="text-sm leading-6 text-muted-foreground">
            {description}
          </div>
        ) : null}
      </div>

      {hasActions ? (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {primaryAction}
          {secondaryAction}
        </div>
      ) : null}
    </div>
  );
}

export { EmptyState, type EmptyStateProps, type EmptyStateVariant };
