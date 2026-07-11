import { apiGet, apiPost, apiDelete } from "@/lib/api";

export type QuickMessage = {
  id: string;
  shortcut: string;
  message: string;
  ownerId: string;
  tenantId: string;
  createdAt: number;
};

export async function listQuickMessages(): Promise<QuickMessage[]> {
  return apiGet("/api/quick-messages");
}

export async function createQuickMessage(data: {
  shortcut: string;
  message: string;
}): Promise<QuickMessage> {
  return apiPost("/api/quick-messages", data);
}

export async function deleteQuickMessage(id: string): Promise<void> {
  return apiDelete(`/api/quick-messages/${id}`);
}
