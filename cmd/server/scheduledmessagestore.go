package main

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/google/uuid"
)

type ScheduledMessage struct {
	ID        string    `json:"id"`
	SessionID string    `json:"session_id"`
	OwnerID   string    `json:"owner_id"`
	Phone     string    `json:"phone"`
	Message   string    `json:"message"`
	SendAt    time.Time `json:"send_at"`
	Status    string    `json:"status"` // "pending", "sent", "failed"
	Error     string    `json:"error"`
	CreatedAt time.Time `json:"created_at"`
}

type ScheduledMessageStore struct {
	db *sql.DB
}

func NewScheduledMessageStore(db *sql.DB) *ScheduledMessageStore {
	return &ScheduledMessageStore{db: db}
}

func (s *ScheduledMessageStore) Init(ctx context.Context) error {
	q := `
	CREATE TABLE IF NOT EXISTS scheduled_messages (
		id TEXT PRIMARY KEY,
		session_id TEXT NOT NULL,
		owner_id TEXT NOT NULL,
		phone TEXT NOT NULL,
		message TEXT NOT NULL,
		send_at DATETIME NOT NULL,
		status TEXT NOT NULL,
		error TEXT NOT NULL DEFAULT '',
		created_at DATETIME NOT NULL
	);
	CREATE INDEX IF NOT EXISTS idx_sched_msg_owner ON scheduled_messages(owner_id);
	CREATE INDEX IF NOT EXISTS idx_sched_msg_status ON scheduled_messages(status, send_at);
	`
	_, err := s.db.ExecContext(ctx, q)
	return err
}

func (s *ScheduledMessageStore) Create(ctx context.Context, msg ScheduledMessage) (ScheduledMessage, error) {
	msg.ID = uuid.NewString()
	msg.CreatedAt = time.Now().UTC()
	msg.Status = "pending"

	q := `INSERT INTO scheduled_messages (id, session_id, owner_id, phone, message, send_at, status, error, created_at)
	      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
	_, err := s.db.ExecContext(ctx, q, msg.ID, msg.SessionID, msg.OwnerID, msg.Phone, msg.Message, msg.SendAt, msg.Status, msg.Error, msg.CreatedAt)
	if err != nil {
		return ScheduledMessage{}, err
	}
	return msg, nil
}

func (s *ScheduledMessageStore) ListByOwner(ctx context.Context, ownerID string) ([]ScheduledMessage, error) {
	q := `SELECT id, session_id, owner_id, phone, message, send_at, status, error, created_at
	      FROM scheduled_messages WHERE owner_id = ? ORDER BY send_at DESC`
	rows, err := s.db.QueryContext(ctx, q, ownerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []ScheduledMessage
	for rows.Next() {
		var m ScheduledMessage
		if err := rows.Scan(&m.ID, &m.SessionID, &m.OwnerID, &m.Phone, &m.Message, &m.SendAt, &m.Status, &m.Error, &m.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, m)
	}
	return out, rows.Err()
}

func (s *ScheduledMessageStore) Delete(ctx context.Context, id, ownerID string) error {
	q := `DELETE FROM scheduled_messages WHERE id = ? AND owner_id = ?`
	res, err := s.db.ExecContext(ctx, q, id, ownerID)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return fmt.Errorf("not found")
	}
	return nil
}

func (s *ScheduledMessageStore) GetPendingToSend(ctx context.Context, until time.Time) ([]ScheduledMessage, error) {
	q := `SELECT id, session_id, owner_id, phone, message, send_at, status, error, created_at
	      FROM scheduled_messages 
	      WHERE status = 'pending' AND send_at <= ?`
	rows, err := s.db.QueryContext(ctx, q, until)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []ScheduledMessage
	for rows.Next() {
		var m ScheduledMessage
		if err := rows.Scan(&m.ID, &m.SessionID, &m.OwnerID, &m.Phone, &m.Message, &m.SendAt, &m.Status, &m.Error, &m.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, m)
	}
	return out, rows.Err()
}

func (s *ScheduledMessageStore) UpdateStatus(ctx context.Context, id, status, errStr string) error {
	q := `UPDATE scheduled_messages SET status = ?, error = ? WHERE id = ?`
	_, err := s.db.ExecContext(ctx, q, status, errStr, id)
	return err
}
