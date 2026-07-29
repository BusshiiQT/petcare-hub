import * as React from "react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type StatCardProps = Omit<React.ComponentPropsWithoutRef<"div">, "title"> & {
  label: React.ReactNode;
  value: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
};

function StatCard({
  label,
  value,
  description,
  icon,
  className,
  ...props
}: StatCardProps) {
  return (
    <Card className={cn("gap-0 py-0", className)} {...props}>
      <CardContent className="flex min-h-28 items-start justify-between gap-4 p-5">
        <dl className="min-w-0">
          <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
          <dd className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
            {value}
          </dd>
          {description ? (
            <dd className="mt-1 text-sm leading-5 text-muted-foreground">
              {description}
            </dd>
          ) : null}
        </dl>

        {icon ? (
          <div
            className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground [&_svg]:size-5"
            aria-hidden="true"
          >
            {icon}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export { StatCard, type StatCardProps };
