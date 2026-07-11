package main

import (
	"context"
	"database/sql"
)

type Announcement struct {
	ID        string `json:"id"`
	Title     string `json:"title"`
	Message   string `json:"message"`
	OwnerID   string `json:"ownerId"`
	TenantID  string `json:"tenantId"`
	CreatedAt int64  `json:"createdAt"`
}

type announcementStore struct {
	db *sql.DB
}

func newAnnouncementStore(db *sql.DB) *announcementStore {
	return &announcementStore{db: db}
}

func (s *announcementStore) init(ctx context.Context) error {
	q := `CREATE TABLE IF NOT EXISTS announcements (
		id TEXT PRIMARY KEY,
		title TEXT NOT NULL,
		message TEXT NOT NULL,
		owner_id TEXT NOT NULL,
		tenant_id TEXT NOT NULL,
		created_at INTEGER NOT NULL
	)`
	_, err := s.db.ExecContext(ctx, q)
	return err
}

func (s *announcementStore) List(ctx context.Context, tenantID string) ([]Announcement, error) {
	q := `SELECT id, title, message, owner_id, tenant_id, created_at FROM announcements WHERE tenant_id = ? ORDER BY created_at DESC`
	rows, err := s.db.QueryContext(ctx, q, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var res []Announcement
	for rows.Next() {
		var a Announcement
		if err := rows.Scan(&a.ID, &a.Title, &a.Message, &a.OwnerID, &a.TenantID, &a.CreatedAt); err != nil {
			return nil, err
		}
		res = append(res, a)
	}
	return res, nil
}

func (s *announcementStore) Create(ctx context.Context, a Announcement) error {
	q := `INSERT INTO announcements (id, title, message, owner_id, tenant_id, created_at) VALUES (?, ?, ?, ?, ?, ?)`
	_, err := s.db.ExecContext(ctx, q, a.ID, a.Title, a.Message, a.OwnerID, a.TenantID, a.CreatedAt)
	return err
}

func (s *announcementStore) Delete(ctx context.Context, id, tenantID string) error {
	q := `DELETE FROM announcements WHERE id = ? AND tenant_id = ?`
	_, err := s.db.ExecContext(ctx, q, id, tenantID)
	return err
}
