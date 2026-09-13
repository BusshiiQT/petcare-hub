"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabaseBrowser";
import { requireUser } from "@/lib/requireUser";

import { PageShell } from "@/components/app/page-shell";
import { PageHeader } from "@/components/app/page-header";
import { PageSection } from "@/components/app/page-section";
import { FeedbackAlert } from "@/components/app/feedback-alert";
import { EmptyState } from "@/components/app/empty-state";
import { LoadingState } from "@/components/app/loading-state";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Pet = {
  id: string;
  owner_id: string;
  name: string;
  type: "dog" | "cat" | "other" | null;
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
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [editingPetId, setEditingPetId] = useState<string | null>(null);
  const [deletingPetId, setDeletingPetId] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const editTriggerRef = useRef<HTMLButtonElement | null>(null);
  const mutationRef = useRef(false);
  const isBusy = isSaving || deletingPetId !== null;

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

      const user = await requireUser(() => router.replace("/auth/login"));

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
  }, [router]);

  const resetForm = () => {
    setEditingPetId(null);
    setName("");
    setType("dog");
    setBreed("");
    setAge("");
    setNotes("");
  };

  const restoreEditorFocus = () => {
    requestAnimationFrame(() => {
      const trigger = editTriggerRef.current;
      if (trigger?.isConnected) trigger.focus();
      else nameInputRef.current?.focus();
      editTriggerRef.current = null;
    });
  };

  const handleEditPet = (pet: Pet, trigger: HTMLButtonElement) => {
    if (mutationRef.current) return;
    editTriggerRef.current = trigger;
    setEditingPetId(pet.id);
    setName(pet.name);
    setType(pet.type);
    setBreed(pet.breed ?? "");
    setAge(pet.age == null ? "" : String(pet.age));
    setNotes(pet.notes ?? "");
    setErrorMsg(null);
    setSuccessMsg(null);
    nameInputRef.current?.focus();
    nameInputRef.current?.scrollIntoView({ block: "center" });
  };

  const handleSavePet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || mutationRef.current) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    const parsedAge = age.trim() === "" ? null : Number(age);
    if (!name.trim()) {
      setErrorMsg("Enter a pet name.");
      nameInputRef.current?.focus();
      return;
    }
    if (parsedAge !== null && (!Number.isInteger(parsedAge) || parsedAge < 0)) {
      setErrorMsg("Age must be a nonnegative whole number or left blank.");
      return;
    }
    mutationRef.current = true;
    setIsSaving(true);
    const fields = {
      name: name.trim(), type, breed: breed.trim() || null,
      age: parsedAge, notes: notes.trim() || null,
    };
    try {
      const query = editingPetId
        ? supabase.from("pets").update(fields).eq("id", editingPetId).eq("owner_id", userId)
        : supabase.from("pets").insert({ ...fields, owner_id: userId });
      const { data, error } = await query
        .select("id, owner_id, name, type, breed, age, notes").single();
      if (error || !data) throw error ?? new Error("No pet returned");
      const savedPet = data as Pet;
      setPets((prev) => editingPetId
        ? prev.map((pet) => pet.id === editingPetId ? savedPet : pet)
        : [...prev, savedPet]);
      setSuccessMsg(editingPetId ? "Pet details saved." : "Pet added.");
      resetForm();
      restoreEditorFocus();
    } catch (error) {
      console.error("Error saving pet:", error);
      setErrorMsg(editingPetId ? "Failed to save pet. Please try again." : "Failed to add pet. Please try again.");
    } finally {
      mutationRef.current = false;
      setIsSaving(false);
    }
  };

  const handleDeletePet = async (petId: string) => {
    if (!userId || mutationRef.current || !confirm("Delete this pet?")) return;
    mutationRef.current = true;
    setDeletingPetId(petId);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const { data, error } = await supabase.from("pets").delete()
        .eq("id", petId).eq("owner_id", userId).select("id").single();
      if (error || !data) throw error ?? new Error("No pet deleted");
      setPets((prev) => prev.filter((p) => p.id !== data.id));
      if (editingPetId === data.id) resetForm();
      setSuccessMsg("Pet deleted.");
      requestAnimationFrame(() => nameInputRef.current?.focus());
    } catch (error) {
      console.error("Error deleting pet:", error);
      setErrorMsg("Pet could not be deleted. Please refresh and try again.");
    } finally {
      mutationRef.current = false;
      setDeletingPetId(null);
    }
  };

  // Skeleton loading state
  if (isLoading) {
    return (
      <PageShell>
        <PageHeader
          title="My pets"
          description="Keep your pets’ details organized for easier care and booking."
        />
        <LoadingState label="Loading your pets">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
            {/* Pets list skeleton */}
            <PageSection title="Your pets">
              <Card>
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
                      <div className="h-8 w-16 bg-gray-100 rounded-md" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </PageSection>

            {/* Add pet form skeleton */}
            <PageSection title="Add a pet">
              <Card>
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
            </PageSection>
          </div>
        </LoadingState>
      </PageShell>
    );
  }

  if (!userId) {
    return (
      <PageShell>
        <PageHeader
          title="My pets"
          description="Keep your pets’ details organized for easier care and booking."
        />
        <PageSection aria-label="Sign in required">
          <EmptyState
            variant="panel"
            title="Sign in to manage your pets"
            description="You need to be logged in to manage your pets."
            primaryAction={
              <Button onClick={() => router.push("/auth/login")}>
                Go to Login
              </Button>
            }
          />
        </PageSection>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="My pets"
        description="Keep your pets’ details organized for easier care and booking."
      />

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
        {/* Pets list */}
        <PageSection title="Your pets">
          {pets.length === 0 ? (
            <EmptyState
              variant="panel"
              title="No pets yet"
              description="Add your first pet to begin booking trusted pet care."
              primaryAction={
                <Button asChild>
                  <a href="#add-pet">Add pet</a>
                </Button>
              }
            />
          ) : (
            <motion.ul
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2"
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
                  className="min-w-0"
                >
                  <Card className="h-full gap-0 py-0">
                    <CardHeader className="gap-1 border-b px-4 py-4">
                      <CardTitle>
                        <h3 className="text-base leading-5">{pet.name}</h3>
                      </CardTitle>
                      <p className="text-sm capitalize text-muted-foreground">
                        {pet.type ?? "Type not provided"}
                        {pet.breed ? ` · ${pet.breed}` : ""}
                      </p>
                    </CardHeader>

                    <CardContent className="flex-1 space-y-4 px-4 py-4">
                      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                        <dt className="font-medium text-foreground">Age</dt>
                        <dd className="text-muted-foreground">
                          {pet.age != null ? pet.age : "Not provided"}
                        </dd>
                      </dl>

                      {pet.notes ? (
                        <div className="space-y-1">
                          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            Notes
                          </p>
                          <p className="text-sm leading-6 text-foreground">
                            {pet.notes}
                          </p>
                        </div>
                      ) : null}
                    </CardContent>

                    <CardFooter className="justify-end gap-2 border-t px-4 py-3">
                      <Button type="button" size="sm" variant="outline"
                        disabled={isBusy} aria-label={`Edit ${pet.name}`}
                        onClick={(event) => handleEditPet(pet, event.currentTarget)}>
                        Edit
                      </Button>
                      <MotionButton
                        type="button"
                        size="sm"
                        variant="outline"
                        className="text-xs"
                        onClick={() => handleDeletePet(pet.id)}
                        disabled={isBusy}
                        aria-label={`Delete ${pet.name}`}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {deletingPetId === pet.id ? "Deleting..." : "Delete"}
                      </MotionButton>
                    </CardFooter>
                  </Card>
                </motion.li>
              ))}
            </motion.ul>
          )}
        </PageSection>

        {/* Add pet form */}
        <PageSection id="add-pet" title={editingPetId ? "Edit pet" : "Add a pet"} className="scroll-mt-24">
          <Card>
            <CardContent>
              <form className="space-y-3" onSubmit={handleSavePet} aria-busy={isBusy}>
                <fieldset disabled={isBusy} className="min-w-0 space-y-3">
                  <div className="space-y-1">
                    <label htmlFor="pet-name" className="block text-xs font-medium text-gray-700">
                      Name
                    </label>
                    <Input
                      id="pet-name"
                      ref={nameInputRef}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      placeholder="Pet name"
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="pet-type" className="block text-xs font-medium text-gray-700">
                      Type
                    </label>
                    <select
                      id="pet-type"
                      className="w-full border rounded-md px-3 py-2 text-sm"
                      value={type ?? ""}
                      onChange={(e) =>
                        setType((e.target.value || null) as Pet["type"])
                      }
                    >
                      <option value="" disabled>Type not provided</option>
                      <option value="dog">Dog</option>
                      <option value="cat">Cat</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="pet-breed" className="block text-xs font-medium text-gray-700">
                      Breed (optional)
                    </label>
                    <Input
                      id="pet-breed"
                      value={breed}
                      onChange={(e) => setBreed(e.target.value)}
                      placeholder="e.g. Golden Retriever"
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="pet-age" className="block text-xs font-medium text-gray-700">
                      Age (optional)
                    </label>
                    <Input
                      id="pet-age"
                      type="number"
                      min="0"
                      step="1"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      placeholder="e.g. 3"
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="pet-notes" className="block text-xs font-medium text-gray-700">
                      Notes (optional)
                    </label>
                    <textarea
                      id="pet-notes"
                      className="w-full border rounded-md px-3 py-2 text-sm"
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Any special care instructions."
                    />
                  </div>
                </fieldset>

                {errorMsg && (
                  <FeedbackAlert variant="error">{errorMsg}</FeedbackAlert>
                )}
                {successMsg && <FeedbackAlert variant="success">{successMsg}</FeedbackAlert>}

                <MotionButton
                  type="submit"
                  className="w-full rounded-full"
                  disabled={isBusy}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                >
                  {isSaving ? "Saving..." : editingPetId ? "Save changes" : "Add pet"}
                </MotionButton>
                {editingPetId && (
                  <Button type="button" variant="outline" className="w-full rounded-full"
                    disabled={isBusy} onClick={() => {
                      resetForm();
                      setErrorMsg(null);
                      setSuccessMsg(null);
                      restoreEditorFocus();
                    }}>
                    Cancel
                  </Button>
                )}
              </form>
            </CardContent>
          </Card>
        </PageSection>
      </div>
    </PageShell>
  );
}
