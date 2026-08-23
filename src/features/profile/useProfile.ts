import { useEffect, useState } from "react";
import type { Profile } from "./types";
import { getProfile } from "./profile";

export function useProfile(userId?: string) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(Boolean(userId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      return;
    }

    let isSubscribed = true;

    getProfile(userId).then(({ profile: fetchedProfile, error: fetchError }) => {
      if (!isSubscribed) return;

      if (fetchError) {
        console.error("Failed to load profile:", fetchError);
        setError(fetchError.message);
        setProfile(null);
      } else {
        setProfile(fetchedProfile);
        setError(null);
      }
      setLoading(false);
    });

    return () => {
      isSubscribed = false;
    };
  }, [userId]);

  return {
    profile: userId ? profile : null,
    loading: userId ? loading : false,
    error: userId ? error : null,
    refetch: () => {
      if (userId) {
        setLoading(true);
        getProfile(userId).then(({ profile: fetchedProfile, error: fetchError }) => {
          if (fetchError) {
            setError(fetchError.message);
          } else {
            setProfile(fetchedProfile);
            setError(null);
          }
          setLoading(false);
        });
      }
    },
  };
}
