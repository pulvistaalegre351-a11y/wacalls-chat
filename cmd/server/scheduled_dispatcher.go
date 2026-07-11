package main

import (
	"context"
	"fmt"
	"time"

	"go.mau.fi/whatsmeow/types"
)

type ScheduledDispatcher struct {
	srv *server
	ctx context.Context
}

func newScheduledDispatcher(srv *server) *ScheduledDispatcher {
	return &ScheduledDispatcher{srv: srv}
}

func (d *ScheduledDispatcher) start(ctx context.Context) {
	d.ctx = ctx
	go d.loop()
}

func (d *ScheduledDispatcher) loop() {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-d.ctx.Done():
			return
		case <-ticker.C:
			d.processPending()
		}
	}
}

func (d *ScheduledDispatcher) processPending() {
	now := time.Now().UTC()
	pending, err := d.srv.scheduledMsgs.GetPendingToSend(d.ctx, now)
	if err != nil {
		d.srv.log.Error("scheduled_dispatcher: failed to get pending", "err", err)
		return
	}

	for _, msg := range pending {
		err := d.sendMsg(msg)
		if err != nil {
			d.srv.scheduledMsgs.UpdateStatus(d.ctx, msg.ID, "failed", err.Error())
		} else {
			d.srv.scheduledMsgs.UpdateStatus(d.ctx, msg.ID, "sent", "")
		}
	}
}

func (d *ScheduledDispatcher) sendMsg(msg ScheduledMessage) error {
	peer, err := parseDialJID(msg.Phone)
	if err != nil {
		return err
	}

	sess, ok := d.srv.sessions.Get(msg.SessionID)
	if !ok || sess == nil || sess.client == nil || !sess.client.IsConnected() {
		return fmt.Errorf("session offline")
	}

	chatJID := types.NewJID(peer.User, peer.Server)
	
	waMsg := d.srv.messages.buildWhatsAppTextMessage(msg.Message, nil)
	
	resp, err := sess.client.SendMessage(d.ctx, chatJID, waMsg)
	if err != nil {
		return err
	}

	// Persist to messageStore so it appears in the chat history:
	dbMsg := ChatMessage{
		ID:        resp.ID,
		SessionID: sess.id,
		OwnerID:   sess.ownerID,
		ChatJID:   chatJID.String(),
		FromMe:    true,
		SenderJID: sess.client.Store.ID.String(),
		SenderName: "",
		Kind:      "text",
		Body:      msg.Message,
		Timestamp: resp.Timestamp.UnixMilli(),
		Status:    "PENDING",
	}
	d.srv.messages.Upsert(d.ctx, dbMsg)

	return nil
}
