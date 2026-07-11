package main

import (
	"context"
	"database/sql"
)

type QuickMessage struct {
	ID        string `json:"id"`
	Shortcut  string `json:"shortcut"`
	Message   string `json:"message"`
	OwnerID   string `json:"ownerId"`
	TenantID  string `json:"tenantId"`
	CreatedAt int64  `json:"createdAt"`
}

type quickMessageStore struct {
	db *sql.DB
}

func newQuickMessageStore(db *sql.DB) *quickMessageStore {
	return &quickMessageStore{db: db}
}

func (s *quickMessageStore) init(ctx context.Context) error {
	q := `CREATE TABLE IF NOT EXISTS quick_messages (
		id TEXT PRIMARY KEY,
		shortcut TEXT NOT NULL,
		message TEXT NOT NULL,
		owner_id TEXT NOT NULL,
		tenant_id TEXT NOT NULL,
		created_at INTEGER NOT NULL
	)`
	_, err := s.db.ExecContext(ctx, q)
	return err
}

func (s *quickMessageStore) List(ctx context.Context, tenantID string) ([]QuickMessage, error) {
	q := `SELECT id, shortcut, message, owner_id, tenant_id, created_at FROM quick_messages WHERE tenant_id = ? ORDER BY shortcut ASC`
	rows, err := s.db.QueryContext(ctx, q, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var res []QuickMessage
	for rows.Next() {
		var m QuickMessage
		if err := rows.Scan(&m.ID, &m.Shortcut, &m.Message, &m.OwnerID, &m.TenantID, &m.CreatedAt); err != nil {
			return nil, err
		}
		res = append(res, m)
	}
	return res, nil
}

func (s *quickMessageStore) Create(ctx context.Context, m QuickMessage) error {
	q := `INSERT INTO quick_messages (id, shortcut, message, owner_id, tenant_id, created_at) VALUES (?, ?, ?, ?, ?, ?)`
	_, err := s.db.ExecContext(ctx, q, m.ID, m.Shortcut, m.Message, m.OwnerID, m.TenantID, m.CreatedAt)
	return err
}

func (s *quickMessageStore) Delete(ctx context.Context, id, tenantID string) error {
	q := `DELETE FROM quick_messages WHERE id = ? AND tenant_id = ?`
	_, err := s.db.ExecContext(ctx, q, id, tenantID)
	return err
}
