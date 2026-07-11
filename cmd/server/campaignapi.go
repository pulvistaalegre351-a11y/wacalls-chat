package main

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/google/uuid"
)

func (s *server) registerCampaignRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/campaigns", s.requireAuth(s.handleListCampaigns))
	mux.HandleFunc("POST /api/campaigns", s.requireAuth(s.handleCreateCampaign))
	mux.HandleFunc("PUT /api/campaigns/{id}/status", s.requireAuth(s.handleUpdateCampaignStatus))
	mux.HandleFunc("DELETE /api/campaigns/{id}", s.requireAuth(s.handleDeleteCampaign))
}

func (s *server) handleListCampaigns(w http.ResponseWriter, r *http.Request) {
	u := currentUserFromReq(r)
	tenant := u.ID
	if !u.IsSuperAdmin() {
		// Use tenant logic if present, else just owner
		tenant = u.TenantID()
		if tenant == "" {
			tenant = u.ID
		}
	}
	
	// Temporarily just using u.ID as ownerID for simplicity unless tenant is needed
	ownerID := u.ID

	campaigns, err := s.campaigns.ListCampaigns(r.Context(), ownerID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	// Fetch progress for each campaign
	type campaignRes struct {
		Campaign
		Progress map[string]int `json:"progress"`
	}
	
	res := make([]campaignRes, 0, len(campaigns))
	for _, c := range campaigns {
		prog, _ := s.campaigns.GetCampaignProgress(r.Context(), c.ID)
		res = append(res, campaignRes{
			Campaign: c,
			Progress: prog,
		})
	}

	writeJSON(w, http.StatusOK, res)
}

func (s *server) handleCreateCampaign(w http.ResponseWriter, r *http.Request) {
	u := currentUserFromReq(r)
	var body struct {
		Name      string   `json:"name"`
		SessionID string   `json:"sessionId"`
		FlowID    string   `json:"flowId"`
		DelaySec  int      `json:"delaySec"`
		Phones    []string `json:"phones"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}
	if body.Name == "" || body.SessionID == "" || body.FlowID == "" || body.DelaySec < 5 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "missing fields or delay < 5s"})
		return
	}
	if len(body.Phones) == 0 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "no phones provided"})
		return
	}

	campaign := Campaign{
		ID:        uuid.New().String(),
		Name:      body.Name,
		SessionID: body.SessionID,
		FlowID:    body.FlowID,
		DelaySec:  body.DelaySec,
		Status:    "paused",
		OwnerID:   u.ID,
		CreatedAt: time.Now().UnixMilli(),
	}

	if err := s.campaigns.CreateCampaign(r.Context(), campaign); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	var contacts []CampaignContact
	for _, p := range body.Phones {
		if p == "" {
			continue
		}
		contacts = append(contacts, CampaignContact{
			ID:         uuid.New().String(),
			CampaignID: campaign.ID,
			Phone:      p,
			Status:     "pending",
		})
	}
	if err := s.campaigns.AddContacts(r.Context(), contacts); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	writeJSON(w, http.StatusOK, campaign)
}

func (s *server) handleUpdateCampaignStatus(w http.ResponseWriter, r *http.Request) {
	u := currentUserFromReq(r)
	id := r.PathValue("id")

	var body struct {
		Status string `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}
	if body.Status != "running" && body.Status != "paused" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid status"})
		return
	}

	if err := s.campaigns.UpdateCampaignStatus(r.Context(), id, body.Status, u.ID); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": body.Status})
}

func (s *server) handleDeleteCampaign(w http.ResponseWriter, r *http.Request) {
	u := currentUserFromReq(r)
	id := r.PathValue("id")

	if err := s.campaigns.DeleteCampaign(r.Context(), id, u.ID); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	writeJSON(w, http.StatusOK, map[string]bool{"success": true})
}
