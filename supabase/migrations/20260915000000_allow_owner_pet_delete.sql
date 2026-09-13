CREATE POLICY "Owners can delete their own pets" ON public.pets
  FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());
