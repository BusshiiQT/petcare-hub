import { Container } from "@/components/container";
import { DashboardSkeleton } from "@/components/dashboard-skeleton";

export default function Loading() {
  return (
    <main className="min-h-screen bg-white py-16">
      <Container>
        <DashboardSkeleton />
      </Container>
    </main>
  );
}
