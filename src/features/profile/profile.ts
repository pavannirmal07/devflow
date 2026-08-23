import { supabase } from "../../lib/supabase/client";
import type { Profile } from "./types";

export async function getProfile(
  userId: string
): Promise<{ profile: Profile | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url, created_at, updated_at")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      return { profile: null, error: new Error(error.message) };
    }

    return { profile: data, error: null };
  } catch (err) {
    return {
      profile: null,
      error: err instanceof Error ? err : new Error("Failed to fetch profile"),
    };
  }
}

export async function updateProfile(
  userId: string,
  displayName: string
): Promise<{ profile: Profile | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .update({ display_name: displayName })
      .eq("id", userId)
      .select()
      .single();

    if (error) {
      return { profile: null, error: new Error(error.message) };
    }

    return { profile: data, error: null };
  } catch (err) {
    return {
      profile: null,
      error: err instanceof Error ? err : new Error("Failed to update profile"),
    };
  }
}
