package main

import (
	"context"
	"fmt"
	"time"

	"go.mau.fi/whatsmeow/proto/waE2E"
	"go.mau.fi/whatsmeow/types"
	"google.golang.org/protobuf/proto"
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
	
	waMsg := &waE2E.Message{Conversation: proto.String(msg.Message)}
	
	resp, err := sess.client.SendMessage(d.ctx, chatJID, waMsg)
	if err != nil {
		return err
	}

	// Persist to messageStore so it appears in the chat history:
	dbMsg := MessageRow{
		ID:        resp.ID,
		SessionID: sess.id,
		ChatJID:   chatJID.String(),
		FromMe:    true,
		SenderJID: jidOrEmpty(sess),
		Kind:      "text",
		Body:      msg.Message,
		Ts:        resp.Timestamp.UnixMilli(),
	}
	if dbMsg.Ts == 0 {
		dbMsg.Ts = time.Now().UnixMilli()
	}
	_ = d.srv.messages.Insert(d.ctx, dbMsg)
	d.srv.broker.emitMessage(dbMsg)

	return nil
}
