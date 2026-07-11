package main

import (
	"encoding/json"
	"net/http"
	"time"
)

func (s *server) registerScheduledMessageRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/scheduled-messages", s.requireAuth(s.handleListScheduledMessages))
	mux.HandleFunc("POST /api/scheduled-messages", s.requireAuth(s.handleCreateScheduledMessage))
	mux.HandleFunc("DELETE /api/scheduled-messages/{id}", s.requireAuth(s.handleDeleteScheduledMessage))
}

func (s *server) handleListScheduledMessages(w http.ResponseWriter, r *http.Request) {
	u := currentUserFromReq(r)
	if u == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	ownerID := clientID(r)

	msgs, err := s.scheduledMsgs.ListByOwner(r.Context(), ownerID)
	if err != nil {
		s.log.Error("list scheduled messages failed", "err", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to list scheduled messages"})
		return
	}
	if msgs == nil {
		msgs = []ScheduledMessage{}
	}
	writeJSON(w, http.StatusOK, msgs)
}

func (s *server) handleCreateScheduledMessage(w http.ResponseWriter, r *http.Request) {
	u := currentUserFromReq(r)
	if u == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	ownerID := clientID(r)

	var req struct {
		SessionID string `json:"session_id"`
		Phone     string `json:"phone"`
		Message   string `json:"message"`
		SendAt    string `json:"send_at"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}

	sendAt, err := time.Parse(time.RFC3339, req.SendAt)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid date format, use RFC3339"})
		return
	}
	if sendAt.Before(time.Now()) {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "send_at must be in the future"})
		return
	}

	msg := ScheduledMessage{
		SessionID: req.SessionID,
		OwnerID:   ownerID,
		Phone:     req.Phone,
		Message:   req.Message,
		SendAt:    sendAt.UTC(),
	}

	created, err := s.scheduledMsgs.Create(r.Context(), msg)
	if err != nil {
		s.log.Error("create scheduled message failed", "err", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to create scheduled message"})
		return
	}

	writeJSON(w, http.StatusCreated, created)
}

func (s *server) handleDeleteScheduledMessage(w http.ResponseWriter, r *http.Request) {
	u := currentUserFromReq(r)
	if u == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	ownerID := clientID(r)
	id := r.PathValue("id")
	if id == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "missing id"})
		return
	}

	err := s.scheduledMsgs.Delete(r.Context(), id, ownerID)
	if err != nil {
		if err.Error() == "not found" {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": "not found"})
			return
		}
		s.log.Error("delete scheduled message failed", "err", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to delete"})
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
