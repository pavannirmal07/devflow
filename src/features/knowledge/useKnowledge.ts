import { useCallback, useEffect, useState } from "react";
import type {
  CreateKnowledgeNoteInput,
  KnowledgeNote,
  UpdateKnowledgeNoteInput,
} from "./types";
import {
  createKnowledgeNote as createKnowledgeNoteApi,
  deleteKnowledgeNote as deleteKnowledgeNoteApi,
  getKnowledgeNotes as getKnowledgeNotesApi,
  togglePinKnowledgeNote as togglePinKnowledgeNoteApi,
  updateKnowledgeNote as updateKnowledgeNoteApi,
} from "./knowledge";

function sortNotes(notes: KnowledgeNote[]): KnowledgeNote[] {
  return [...notes].sort((a, b) => {
    if (a.is_pinned !== b.is_pinned) {
      return a.is_pinned ? -1 : 1;
    }
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });
}

export function useKnowledge(userId?: string) {
  const [notes, setNotes] = useState<KnowledgeNote[]>([]);
  const [loading, setLoading] = useState(Boolean(userId));
  const [error, setError] = useState<string | null>(null);

  const fetchNotes = useCallback(async (uid: string) => {
    setLoading(true);
    const { notes: fetchedNotes, error: fetchError } = await getKnowledgeNotesApi(uid);
    if (fetchError) {
      console.error("Failed to load knowledge notes:", fetchError);
      setError(fetchError.message);
      setNotes([]);
    } else {
      setNotes(sortNotes(fetchedNotes || []));
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!userId) {
      return;
    }

    let isSubscribed = true;
    getKnowledgeNotesApi(userId).then(({ notes: fetchedNotes, error: fetchError }) => {
      if (!isSubscribed) return;
      if (fetchError) {
        console.error("Failed to load knowledge notes:", fetchError);
        setError(fetchError.message);
        setNotes([]);
      } else {
        setNotes(sortNotes(fetchedNotes || []));
        setError(null);
      }
      setLoading(false);
    });

    return () => {
      isSubscribed = false;
    };
  }, [userId]);

  const createNote = useCallback(
    async (
      input: CreateKnowledgeNoteInput
    ): Promise<{ note: KnowledgeNote | null; error: Error | null }> => {
      if (!userId) {
        const err = new Error("User must be authenticated to create a knowledge note");
        setError(err.message);
        return { note: null, error: err };
      }

      const { note: newNote, error: createError } = await createKnowledgeNoteApi(
        userId,
        input
      );

      if (createError) {
        setError(createError.message);
        return { note: null, error: createError };
      }

      if (newNote) {
        setNotes((prev) => sortNotes([newNote, ...prev.filter((n) => n.id !== newNote.id)]));
        setError(null);
      }

      return { note: newNote, error: null };
    },
    [userId]
  );

  const updateNote = useCallback(
    async (
      noteId: string,
      input: UpdateKnowledgeNoteInput
    ): Promise<{ note: KnowledgeNote | null; error: Error | null }> => {
      const { note: updatedNote, error: updateError } = await updateKnowledgeNoteApi(
        noteId,
        input
      );

      if (updateError) {
        setError(updateError.message);
        return { note: null, error: updateError };
      }

      if (updatedNote) {
        setNotes((prev) =>
          sortNotes(prev.map((n) => (n.id === noteId ? updatedNote : n)))
        );
        setError(null);
      }

      return { note: updatedNote, error: null };
    },
    []
  );

  const deleteNote = useCallback(
    async (noteId: string): Promise<{ error: Error | null }> => {
      const { error: deleteError } = await deleteKnowledgeNoteApi(noteId);

      if (deleteError) {
        setError(deleteError.message);
        return { error: deleteError };
      }

      setNotes((prev) => prev.filter((n) => n.id !== noteId));
      setError(null);
      return { error: null };
    },
    []
  );

  const togglePinNote = useCallback(
    async (
      noteId: string,
      isPinned: boolean
    ): Promise<{ note: KnowledgeNote | null; error: Error | null }> => {
      // Optimistic update
      setNotes((prev) =>
        sortNotes(
          prev.map((n) => (n.id === noteId ? { ...n, is_pinned: isPinned } : n))
        )
      );

      const { note: updatedNote, error: pinError } = await togglePinKnowledgeNoteApi(
        noteId,
        isPinned
      );

      if (pinError) {
        setError(pinError.message);
        // Rollback
        if (userId) void fetchNotes(userId);
        return { note: null, error: pinError };
      }

      if (updatedNote) {
        setNotes((prev) =>
          sortNotes(prev.map((n) => (n.id === noteId ? updatedNote : n)))
        );
        setError(null);
      }

      return { note: updatedNote, error: null };
    },
    [userId, fetchNotes]
  );

  const refreshNotes = useCallback(async (): Promise<void> => {
    if (userId) {
      await fetchNotes(userId);
    }
  }, [userId, fetchNotes]);

  return {
    notes: userId ? notes : [],
    loading: userId ? loading : false,
    error: userId ? error : null,
    createNote,
    updateNote,
    deleteNote,
    togglePinNote,
    refreshNotes,
  };
}
