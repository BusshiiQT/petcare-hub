import * as React from "react";

import { cn } from "@/lib/utils";

type LoadingStateProps = React.ComponentPropsWithoutRef<"div"> & {
  label?: string;
};

function LoadingState({
  label = "Loading",
  children,
  className,
  ...props
}: LoadingStateProps) {
  return (
    <div
      className={cn("min-w-0", className)}
      {...props}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

export { LoadingState, type LoadingStateProps };
