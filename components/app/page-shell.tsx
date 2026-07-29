import * as React from "react";

import { Container } from "@/components/container";
import { cn } from "@/lib/utils";

type PageShellProps = React.ComponentPropsWithoutRef<"div">;

function PageShell({ className, children, ...props }: PageShellProps) {
  return (
    <div className={cn("py-8 sm:py-10 lg:py-12", className)} {...props}>
      <Container>
        <div className="space-y-8">{children}</div>
      </Container>
    </div>
  );
}

export { PageShell, type PageShellProps };
