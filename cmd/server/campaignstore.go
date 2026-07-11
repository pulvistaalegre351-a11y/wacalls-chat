package main

import (
	"context"
	"database/sql"
	"errors"
	"time"
)

type Campaign struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	SessionID string `json:"sessionId"`
	FlowID    string `json:"flowId"` // The flow to run when the call is answered
	DelaySec  int    `json:"delaySec"`
	Status    string `json:"status"` // "running", "paused", "completed"
	OwnerID   string `json:"ownerId,omitempty"`
	CreatedAt int64  `json:"createdAt"`
}

type CampaignContact struct {
	ID         string `json:"id"`
	CampaignID string `json:"campaignId"`
	Phone      string `json:"phone"`
	Status     string `json:"status"` // "pending", "calling", "answered", "failed"
	UpdatedAt  int64  `json:"updatedAt"`
}

type campaignStore struct {
	db *sql.DB
}

func newCampaignStore(db *sql.DB) *campaignStore {
	return &campaignStore{db: db}
}

func (s *campaignStore) init(ctx context.Context) error {
	_, err := s.db.ExecContext(ctx, `
		CREATE TABLE IF NOT EXISTS campaigns (
			id TEXT PRIMARY KEY,
			name TEXT,
			session_id TEXT,
			flow_id TEXT,
			delay_sec INTEGER,
			status TEXT,
			owner_id TEXT,
			created_at INTEGER
		);
		CREATE TABLE IF NOT EXISTS campaign_contacts (
			id TEXT PRIMARY KEY,
			campaign_id TEXT,
			phone TEXT,
			status TEXT,
			updated_at INTEGER,
			FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
		);
		CREATE INDEX IF NOT EXISTS idx_campaigns_owner ON campaigns(owner_id);
		CREATE INDEX IF NOT EXISTS idx_campaign_contacts_camp ON campaign_contacts(campaign_id);
		CREATE INDEX IF NOT EXISTS idx_campaign_contacts_status ON campaign_contacts(status);
	`)
	return err
}

func (s *campaignStore) CreateCampaign(ctx context.Context, c Campaign) error {
	if c.ID == "" || c.Name == "" || c.SessionID == "" {
		return errors.New("missing required campaign fields")
	}
	if c.Status == "" {
		c.Status = "paused"
	}
	if c.CreatedAt == 0 {
		c.CreatedAt = time.Now().UnixMilli()
	}
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO campaigns (id, name, session_id, flow_id, delay_sec, status, owner_id, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
	`, c.ID, c.Name, c.SessionID, c.FlowID, c.DelaySec, c.Status, c.OwnerID, c.CreatedAt)
	return err
}

func (s *campaignStore) ListCampaigns(ctx context.Context, ownerID string) ([]Campaign, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT id, name, session_id, flow_id, delay_sec, status, owner_id, created_at
		FROM campaigns
		WHERE owner_id = ?
		ORDER BY created_at DESC
	`, ownerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []Campaign
	for rows.Next() {
		var c Campaign
		if err := rows.Scan(&c.ID, &c.Name, &c.SessionID, &c.FlowID, &c.DelaySec, &c.Status, &c.OwnerID, &c.CreatedAt); err != nil {
			continue
		}
		list = append(list, c)
	}
	return list, nil
}

func (s *campaignStore) UpdateCampaignStatus(ctx context.Context, id, status, ownerID string) error {
	res, err := s.db.ExecContext(ctx, `
		UPDATE campaigns SET status = ? WHERE id = ? AND owner_id = ?
	`, status, id, ownerID)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return errors.New("campaign not found or unauthorized")
	}
	return nil
}

func (s *campaignStore) AddContacts(ctx context.Context, contacts []CampaignContact) error {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	stmt, err := tx.PrepareContext(ctx, `
		INSERT INTO campaign_contacts (id, campaign_id, phone, status, updated_at)
		VALUES (?, ?, ?, ?, ?)
	`)
	if err != nil {
		tx.Rollback()
		return err
	}
	defer stmt.Close()

	now := time.Now().UnixMilli()
	for _, c := range contacts {
		if c.Status == "" {
			c.Status = "pending"
		}
		if _, err := stmt.ExecContext(ctx, c.ID, c.CampaignID, c.Phone, c.Status, now); err != nil {
			tx.Rollback()
			return err
		}
	}
	return tx.Commit()
}

func (s *campaignStore) GetPendingContactsCount(ctx context.Context, campaignID string) (int, error) {
	var count int
	err := s.db.QueryRowContext(ctx, `
		SELECT count(*) FROM campaign_contacts WHERE campaign_id = ? AND status = 'pending'
	`, campaignID).Scan(&count)
	return count, err
}

func (s *campaignStore) GetActiveCampaigns(ctx context.Context) ([]Campaign, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT id, name, session_id, flow_id, delay_sec, status, owner_id, created_at
		FROM campaigns
		WHERE status = 'running'
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []Campaign
	for rows.Next() {
		var c Campaign
		if err := rows.Scan(&c.ID, &c.Name, &c.SessionID, &c.FlowID, &c.DelaySec, &c.Status, &c.OwnerID, &c.CreatedAt); err != nil {
			continue
		}
		list = append(list, c)
	}
	return list, nil
}

func (s *campaignStore) GetNextPendingContact(ctx context.Context, campaignID string) (*CampaignContact, error) {
	var c CampaignContact
	err := s.db.QueryRowContext(ctx, `
		SELECT id, campaign_id, phone, status, updated_at
		FROM campaign_contacts
		WHERE campaign_id = ? AND status = 'pending'
		ORDER BY updated_at ASC
		LIMIT 1
	`, campaignID).Scan(&c.ID, &c.CampaignID, &c.Phone, &c.Status, &c.UpdatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil // No pending contacts
		}
		return nil, err
	}
	return &c, nil
}

func (s *campaignStore) UpdateContactStatus(ctx context.Context, contactID, status string) error {
	now := time.Now().UnixMilli()
	_, err := s.db.ExecContext(ctx, `
		UPDATE campaign_contacts SET status = ?, updated_at = ? WHERE id = ?
	`, status, now, contactID)
	return err
}

func (s *campaignStore) DeleteCampaign(ctx context.Context, id, ownerID string) error {
	_, err := s.db.ExecContext(ctx, `
		DELETE FROM campaigns WHERE id = ? AND owner_id = ?
	`, id, ownerID)
	return err
}

func (s *campaignStore) GetCampaignProgress(ctx context.Context, campaignID string) (map[string]int, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT status, count(*) FROM campaign_contacts WHERE campaign_id = ? GROUP BY status
	`, campaignID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	res := map[string]int{
		"pending":  0,
		"calling":  0,
		"answered": 0,
		"failed":   0,
		"total":    0,
	}
	for rows.Next() {
		var status string
		var count int
		if err := rows.Scan(&status, &count); err != nil {
			continue
		}
		res[status] = count
		res["total"] += count
	}
	return res, nil
}
