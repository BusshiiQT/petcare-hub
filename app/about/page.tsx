import { Container } from "@/components/container";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-white py-16">
      <Container>
        <Card>
          <CardHeader>
            <CardTitle>About PetCare Hub</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-gray-700">
            <p>
              PetCare Hub is a marketplace that connects pet owners with trusted
              walkers, sitters, and trainers.
            </p>
            <p>
              Our goal is to make pet care simple, safe, and transparent. Owners
              can create detailed pet profiles, browse verified providers, and
              book services with confidence.
            </p>
            <p>
              In the future, we&apos;ll add features like real-time booking,
              reviews, messaging, and more — all built with performance and
              reliability in mind.
            </p>
          </CardContent>
        </Card>
      </Container>
    </main>
  );
}
