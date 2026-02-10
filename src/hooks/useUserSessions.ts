import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type UserSession = {
  user_id: string;
  user_email: string | null;
  user_full_name: string | null;
  session_label: string | null;
  last_seen: string;
  created_at: string;
};

type UserSessionsResponse = {
  sessions: UserSession[];
};

export function useUserSessions(enabled = true) {
  return useQuery({
    queryKey: ["user-sessions"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("user-sessions", {
        body: { action: "list", window_minutes: 10 },
      });
      if (error) throw error;
      return data as UserSessionsResponse;
    },
    enabled,
  });
}

export function useRevokeUserSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.functions.invoke("user-sessions", {
        body: { action: "revoke_user", user_id: userId },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Session revoked");
      queryClient.invalidateQueries({ queryKey: ["user-sessions"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useRevokeOtherSessions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (keepUserId: string) => {
      const { error } = await supabase.functions.invoke("user-sessions", {
        body: { action: "revoke_others", keep_user_id: keepUserId },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Other sessions revoked");
      queryClient.invalidateQueries({ queryKey: ["user-sessions"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useRevokeAllSessions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke("user-sessions", {
        body: { action: "revoke_all" },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("All sessions revoked");
      queryClient.invalidateQueries({ queryKey: ["user-sessions"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}
