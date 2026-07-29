import * as React from "react";

import { cn } from "@/lib/utils";

type PageSectionProps = Omit<
  React.ComponentPropsWithoutRef<"section">,
  "title"
> & {
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  contentClassName?: string;
};

function PageSection({
  title,
  description,
  actions,
  contentClassName,
  className,
  children,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  ...props
}: PageSectionProps) {
  const generatedTitleId = React.useId();
  const titleId = ariaLabelledBy ?? generatedTitleId;
  const hasHeader = title || description || actions;

  return (
    <section
      className={cn("space-y-4", className)}
      aria-label={ariaLabel}
      aria-labelledby={title && !ariaLabel ? titleId : ariaLabelledBy}
      {...props}
    >
      {hasHeader ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 max-w-3xl space-y-1">
            {title ? (
              <h2
                id={titleId}
                className="text-lg font-semibold tracking-tight text-foreground"
              >
                {title}
              </h2>
            ) : null}
            {description ? (
              <p className="text-sm leading-6 text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>

          {actions ? (
            <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
              {actions}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className={cn("min-w-0", contentClassName)}>{children}</div>
    </section>
  );
}

export { PageSection, type PageSectionProps };
