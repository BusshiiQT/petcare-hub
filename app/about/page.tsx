import { PageShell } from "@/components/app/page-shell";
import { PageHeader } from "@/components/app/page-header";
import { PageSection } from "@/components/app/page-section";
import { Card, CardContent } from "@/components/ui/card";

export default function AboutPage() {
  return (
    <PageShell>
      <PageHeader
        title="About PetCare Hub"
        description="A portfolio marketplace experience for pet owners and care providers."
      />

      <PageSection title="Pet care in one workspace">
        <Card className="max-w-3xl">
          <CardContent className="space-y-5 text-sm leading-7 text-muted-foreground sm:text-base">
            <p>
              PetCare Hub is a marketplace experience that connects pet owners
              with walkers, sitters, trainers, and other care providers.
            </p>
            <p>
              Owners can create pet profiles, browse active provider profiles,
              request services around provider availability, manage bookings,
              and leave reviews. Providers can publish their services and rates,
              manage weekly availability, and update booking status.
            </p>
            <p>
              The application uses Next.js 16, React 19, Supabase, and reusable
              accessible interface components to demonstrate a cohesive,
              responsive product workflow.
            </p>
          </CardContent>
        </Card>
      </PageSection>
    </PageShell>
  );
}
