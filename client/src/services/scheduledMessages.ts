import { apiGet, apiPost, apiDelete } from "@/lib/api";

export type ScheduledMessage = {
  id: string;
  session_id: string;
  owner_id: string;
  phone: string;
  message: string;
  send_at: string;
  status: string;
  error: string;
  created_at: string;
};

export async function listScheduledMessages(): Promise<ScheduledMessage[]> {
  const res = await apiGet("/api/scheduled-messages");
  return res as ScheduledMessage[];
}

export async function createScheduledMessage(data: {
  session_id: string;
  phone: string;
  message: string;
  send_at: string;
}): Promise<ScheduledMessage> {
  const res = await apiPost("/api/scheduled-messages", data);
  return res as ScheduledMessage;
}

export async function deleteScheduledMessage(id: string): Promise<void> {
  await apiDelete(`/api/scheduled-messages/${id}`);
}
