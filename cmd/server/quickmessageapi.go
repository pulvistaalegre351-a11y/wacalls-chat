package main

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/google/uuid"
)

func (s *server) registerQuickMessageRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/quick-messages", s.requireAuth(s.handleListQuickMessages))
	mux.HandleFunc("POST /api/quick-messages", s.requireAuth(s.handleCreateQuickMessage))
	mux.HandleFunc("DELETE /api/quick-messages/{id}", s.requireAuth(s.handleDeleteQuickMessage))
}

func (s *server) handleListQuickMessages(w http.ResponseWriter, r *http.Request) {
	u := currentUserFromReq(r)
	tenant := u.TenantID
	if tenant == "" {
		tenant = u.ID
	}

	msgs, err := s.quickMessages.List(r.Context(), tenant)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, msgs)
}

func (s *server) handleCreateQuickMessage(w http.ResponseWriter, r *http.Request) {
	u := currentUserFromReq(r)
	tenant := u.TenantID
	if tenant == "" {
		tenant = u.ID
	}

	var body struct {
		Shortcut string `json:"shortcut"`
		Message  string `json:"message"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}

	msg := QuickMessage{
		ID:        uuid.New().String(),
		Shortcut:  body.Shortcut,
		Message:   body.Message,
		OwnerID:   u.ID,
		TenantID:  tenant,
		CreatedAt: time.Now().UnixMilli(),
	}

	if err := s.quickMessages.Create(r.Context(), msg); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, msg)
}

func (s *server) handleDeleteQuickMessage(w http.ResponseWriter, r *http.Request) {
	u := currentUserFromReq(r)
	tenant := u.TenantID
	if tenant == "" {
		tenant = u.ID
	}
	id := r.PathValue("id")

	if err := s.quickMessages.Delete(r.Context(), id, tenant); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"success": true})
}
