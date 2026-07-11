package main

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/google/uuid"
)

func (s *server) registerAnnouncementRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/announcements", s.requireAuth(s.handleListAnnouncements))
	mux.HandleFunc("POST /api/announcements", s.requireAdmin(s.handleCreateAnnouncement)) // only admins
	mux.HandleFunc("DELETE /api/announcements/{id}", s.requireAdmin(s.handleDeleteAnnouncement))
}

func (s *server) handleListAnnouncements(w http.ResponseWriter, r *http.Request) {
	u := currentUserFromReq(r)
	tenant := u.TenantID()
	if tenant == "" {
		tenant = u.ID
	}

	anns, err := s.announcements.List(r.Context(), tenant)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	// Return as JSON array directly, or object? Array is simpler.
	if anns == nil {
		anns = []Announcement{}
	}
	writeJSON(w, http.StatusOK, anns)
}

func (s *server) handleCreateAnnouncement(w http.ResponseWriter, r *http.Request) {
	u := currentUserFromReq(r)
	tenant := u.TenantID()
	if tenant == "" {
		tenant = u.ID
	}

	var body struct {
		Title   string `json:"title"`
		Message string `json:"message"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}

	ann := Announcement{
		ID:        uuid.New().String(),
		Title:     body.Title,
		Message:   body.Message,
		OwnerID:   u.ID,
		TenantID:  tenant,
		CreatedAt: time.Now().UnixMilli(),
	}

	if err := s.announcements.Create(r.Context(), ann); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, ann)
}

func (s *server) handleDeleteAnnouncement(w http.ResponseWriter, r *http.Request) {
	u := currentUserFromReq(r)
	tenant := u.TenantID()
	if tenant == "" {
		tenant = u.ID
	}
	id := r.PathValue("id")

	if err := s.announcements.Delete(r.Context(), id, tenant); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"success": true})
}
