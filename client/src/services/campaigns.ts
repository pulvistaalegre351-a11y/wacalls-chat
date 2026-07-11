import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";

export type Campaign = {
  id: string;
  name: string;
  sessionId: string;
  flowId: string;
  delaySec: number;
  status: string;
  progress?: {
    pending: number;
    calling: number;
    answered: number;
    failed: number;
    total: number;
  };
};

export async function listCampaigns(): Promise<Campaign[]> {
  return apiGet("/api/campaigns");
}

export async function createCampaign(data: {
  name: string;
  sessionId: string;
  flowId: string;
  delaySec: number;
  phones: string[];
}): Promise<Campaign> {
  return apiPost("/api/campaigns", data);
}

export async function updateCampaignStatus(id: string, status: "running" | "paused"): Promise<void> {
  // Use fetch directly for PUT since apiPut is missing, or we can use POST in Go and use apiPost.
  // Wait, I created a PUT endpoint in campaignapi.go. Let's just use native fetch for this, or apiPatch in Go?
  // Go campaignapi.go handles PUT /api/campaigns/{id}/status. Let's use native fetch with baseHeaders, or we can change Go to POST.
  // Actually, I can just use fetch directly. But wait, I'll use fetch with credentials.
  const r = await fetch(`/api/campaigns/${id}/status`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!r.ok) throw new Error("Erro ao atualizar status");
}

export async function deleteCampaign(id: string): Promise<void> {
  return apiDelete(`/api/campaigns/${id}`);
}
