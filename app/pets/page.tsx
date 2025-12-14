"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabaseClient";
import { Container } from "@/components/container";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Pet = {
  id: string;
  owner_id: string;
  name: string;
  type: "dog" | "cat" | "other";
  breed: string | null;
  age: number | null;
  notes: string | null;
};

const MotionButton = motion(Button);

export default function PetsPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [pets, setPets] = useState<Pet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // New pet form state
  const [name, setName] = useState("");
  const [type, setType] = useState<Pet["type"]>("dog");
  const [breed, setBreed] = useState("");
  const [age, setAge] = useState<string>("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const loadPets = async () => {
      setIsLoading(true);
      setErrorMsg(null);

      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;

      if (!user) {
        setIsLoading(false);
        setUserId(null);
        return;
      }

      setUserId(user.id);

      const { data, error } = await supabase
        .from("pets")
        .select("id, owner_id, name, type, breed, age, notes")
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error loading pets:", error);
        setErrorMsg("Failed to load your pets.");
      } else {
        setPets((data || []) as Pet[]);
      }

      setIsLoading(false);
    };

    loadPets();
  }, []);

  const handleAddPet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    setIsSaving(true);
    setErrorMsg(null);

    const { data, error } = await supabase
      .from("pets")
      .insert({
        owner_id: userId,
        name,
        type,
        breed: breed || null,
        age: age === "" ? null : Number(age),
        notes: notes || null,
      })
      .select("id, owner_id, name, type, breed, age, notes")
      .single();

    setIsSaving(false);

    if (error) {
      console.error("Error adding pet:", error);
      setErrorMsg("Failed to add pet.");
      return;
    }

    if (data) {
      setPets((prev) => [...prev, data as Pet]);
      setName("");
      setType("dog");
      setBreed("");
      setAge("");
      setNotes("");
    }
  };

  const handleDeletePet = async (petId: string) => {
    if (!confirm("Delete this pet?")) return;

    const { error } = await supabase.from("pets").delete().eq("id", petId);

    if (error) {
      console.error("Error deleting pet:", error);
      alert("Failed to delete pet.");
      return;
    }

    setPets((prev) => prev.filter((p) => p.id !== petId));
  };

  // Skeleton loading state
  if (isLoading) {
    return (
      <main className="min-h-screen bg-white py-16">
        <Container>
          <div className="grid gap-8 md:grid-cols-[1.2fr,1fr]">
            {/* Pets list skeleton */}
            <Card>
              <CardHeader>
                <CardTitle>Your Pets</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Array.from({ length: 3 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="flex items-start justify-between border rounded-md px-3 py-2 text-sm animate-pulse"
                  >
                    <div className="space-y-1">
                      <div className="h-4 w-28 bg-gray-100 rounded-md" />
                      <div className="h-3 w-24 bg-gray-100 rounded-md" />
                      <div className="h-3 w-16 bg-gray-100 rounded-md" />
                      <div className="h-3 w-32 bg-gray-100 rounded-md" />
                    </div>
                    <div className="h-7 w-14 bg-gray-100 rounded-md" />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Add pet form skeleton */}
            <Card>
              <CardHeader>
                <CardTitle>Add a Pet</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 animate-pulse">
                <div className="h-4 w-24 bg-gray-100 rounded-md" />
                <div className="h-9 w-full bg-gray-100 rounded-md" />
                <div className="h-4 w-24 bg-gray-100 rounded-md" />
                <div className="h-9 w-full bg-gray-100 rounded-md" />
                <div className="h-4 w-32 bg-gray-100 rounded-md" />
                <div className="h-9 w-full bg-gray-100 rounded-md" />
                <div className="h-4 w-32 bg-gray-100 rounded-md" />
                <div className="h-16 w-full bg-gray-100 rounded-md" />
                <div className="h-9 w-full bg-gray-100 rounded-full" />
              </CardContent>
            </Card>
          </div>
        </Container>
      </main>
    );
  }

  if (!userId) {
    return (
      <main className="min-h-screen bg-white py-16">
        <Container>
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle>Your Pets</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-700">
                You need to be logged in to manage your pets.
              </p>
              <Button onClick={() => router.push("/auth/login")}>
                Go to Login
              </Button>
            </CardContent>
          </Card>
        </Container>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white py-16">
      <Container>
        <div className="grid gap-8 md:grid-cols-[1.2fr,1fr]">
          {/* Pets list */}
          <Card>
            <CardHeader>
              <CardTitle>Your Pets</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {pets.length === 0 ? (
                <p className="text-sm text-gray-600">
                  You haven&apos;t added any pets yet.
                </p>
              ) : (
                <motion.ul
                  className="space-y-3"
                  initial="hidden"
                  animate="show"
                  variants={{
                    hidden: { opacity: 0 },
                    show: {
                      opacity: 1,
                      transition: { staggerChildren: 0.05 },
                    },
                  }}
                >
                  {pets.map((pet) => (
                    <motion.li
                      key={pet.id}
                      variants={{
                        hidden: { opacity: 0, y: 8 },
                        show: { opacity: 1, y: 0 },
                      }}
                      className="flex items-start justify-between border rounded-md px-3 py-2 text-sm"
                    >
                      <div>
                        <p className="font-medium">
                          {pet.name}{" "}
                          <span className="text-xs text-gray-500">
                            ({pet.type})
                          </span>
                        </p>
                        {pet.breed && (
                          <p className="text-gray-600 text-xs">
                            Breed: {pet.breed}
                          </p>
                        )}
                        {pet.age != null && (
                          <p className="text-gray-600 text-xs">
                            Age: {pet.age}
                          </p>
                        )}
                        {pet.notes && (
                          <p className="text-gray-500 text-xs mt-1">
                            {pet.notes}
                          </p>
                        )}
                      </div>
                      <MotionButton
                        type="button"
                        size="sm"
                        variant="outline"
                        className="text-xs"
                        onClick={() => handleDeletePet(pet.id)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        Delete
                      </MotionButton>
                    </motion.li>
                  ))}
                </motion.ul>
              )}
            </CardContent>
          </Card>

          {/* Add pet form */}
          <Card>
            <CardHeader>
              <CardTitle>Add a Pet</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-3" onSubmit={handleAddPet}>
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-gray-700">
                    Name
                  </label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Pet name"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-medium text-gray-700">
                    Type
                  </label>
                  <select
                    className="w-full border rounded-md px-3 py-2 text-sm"
                    value={type}
                    onChange={(e) =>
                      setType(e.target.value as Pet["type"])
                    }
                  >
                    <option value="dog">Dog</option>
                    <option value="cat">Cat</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-medium text-gray-700">
                    Breed (optional)
                  </label>
                  <Input
                    value={breed}
                    onChange={(e) => setBreed(e.target.value)}
                    placeholder="e.g. Golden Retriever"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-medium text-gray-700">
                    Age (optional)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="e.g. 3"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-medium text-gray-700">
                    Notes (optional)
                  </label>
                  <textarea
                    className="w-full border rounded-md px-3 py-2 text-sm"
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any special care instructions."
                  />
                </div>

                {errorMsg && (
                  <p className="text-sm text-red-600 mb-1">{errorMsg}</p>
                )}

                <MotionButton
                  type="submit"
                  className="w-full rounded-full"
                  disabled={isSaving}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                >
                  {isSaving ? "Adding..." : "Add pet"}
                </MotionButton>
              </form>
            </CardContent>
          </Card>
        </div>
      </Container>
    </main>
  );
}
