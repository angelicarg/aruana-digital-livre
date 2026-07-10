import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Meeting = Tables<"intranet_meetings">;
export type MeetingInsert = TablesInsert<"intranet_meetings">;
export type MeetingUpdate = TablesUpdate<"intranet_meetings">;

export type MeetingWithClient = Meeting & { intranet_clients: { name: string } | null };

export async function listMeetings() {
  const { data, error } = await supabase
    .from("intranet_meetings")
    .select("*, intranet_clients(name)")
    .order("scheduled_at", { ascending: true });

  if (error) throw error;
  return data as MeetingWithClient[];
}

export async function createMeeting(input: MeetingInsert) {
  const { data, error } = await supabase.from("intranet_meetings").insert(input).select().single();
  if (error) throw error;
  return data;
}

export async function updateMeeting(id: string, input: MeetingUpdate) {
  const { data, error } = await supabase
    .from("intranet_meetings")
    .update(input)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteMeeting(id: string) {
  const { error } = await supabase.from("intranet_meetings").delete().eq("id", id);
  if (error) throw error;
}

export const MEETING_STATUS_LABELS: Record<Meeting["status"], string> = {
  agendado: "Agendado",
  realizado: "Realizado",
  cancelado: "Cancelado",
};

export const MEETING_TYPE_LABELS: Record<Meeting["meeting_type"], string> = {
  prospeccao: "Prospecção",
  andamento: "Andamento de projeto",
  outro: "Outro",
};
