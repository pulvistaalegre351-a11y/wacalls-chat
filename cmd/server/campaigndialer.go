package main

import (
	"context"
	"log/slog"
	"time"
)

// campaignDialer is a background worker that polls for active campaigns,
// checks their delay, and fires outbound calls.
type campaignDialer struct {
	srv    *server
	ctx    context.Context
	cancel context.CancelFunc
}

func newCampaignDialer(s *server) *campaignDialer {
	ctx, cancel := context.WithCancel(context.Background())
	return &campaignDialer{
		srv:    s,
		ctx:    ctx,
		cancel: cancel,
	}
}

func (d *campaignDialer) start() {
	go d.loop()
}

func (d *campaignDialer) stop() {
	d.cancel()
}

func (d *campaignDialer) loop() {
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()

	// Track last dial time per campaign to respect delay
	lastDial := make(map[string]time.Time)

	for {
		select {
		case <-d.ctx.Done():
			return
		case <-ticker.C:
			d.process(lastDial)
		}
	}
}

func (d *campaignDialer) process(lastDial map[string]time.Time) {
	campaigns, err := d.srv.campaigns.GetActiveCampaigns(d.ctx)
	if err != nil {
		d.srv.log.Error("dialer: failed to get active campaigns", "err", err)
		return
	}

	for _, c := range campaigns {
		// Check delay
		last := lastDial[c.ID]
		delay := time.Duration(c.DelaySec) * time.Second
		if time.Since(last) < delay {
			continue
		}

		// Check if we have an available slot (operator count limits etc, but for campaigns maybe just 1 concurrent call per campaign)
		// For simplicity, we process one contact
		contact, err := d.srv.campaigns.GetNextPendingContact(d.ctx, c.ID)
		if err != nil {
			d.srv.log.Error("dialer: failed to get next contact", "campaign", c.ID, "err", err)
			continue
		}
		if contact == nil {
			// No pending contacts. Mark campaign as completed.
			d.srv.campaigns.UpdateCampaignStatus(d.ctx, c.ID, "completed", c.OwnerID)
			continue
		}

		// Dial
		d.srv.campaigns.UpdateContactStatus(d.ctx, contact.ID, "calling")
		lastDial[c.ID] = time.Now()

		go d.dialContact(c, *contact)
	}
}

func (d *campaignDialer) dialContact(c Campaign, contact CampaignContact) {
	// Parse phone
	peer, err := parseDialJID(contact.Phone)
	if err != nil {
		d.srv.campaigns.UpdateContactStatus(d.ctx, contact.ID, "failed")
		return
	}

	sess, err := d.srv.sessions.Get(c.SessionID)
	if err != nil || sess == nil || !sess.IsReady() {
		// Session unavailable
		d.srv.campaigns.UpdateContactStatus(d.ctx, contact.ID, "failed")
		return
	}

	// 1. Start Outgoing
	callID, err := sess.startOutgoing(d.ctx, peer, false)
	if err != nil {
		d.srv.log.Warn("dialer: failed to start call", "contact", contact.Phone, "err", err)
		d.srv.campaigns.UpdateContactStatus(d.ctx, contact.ID, "failed")
		return
	}

	// Record the call in broker for tracking
	d.srv.broker.upsertCall(CallRecord{
		SessionID: c.SessionID,
		CallID:    callID,
		Direction: "outbound",
		Peer:      peer.String(),
		StartedAt: time.Now().UnixMilli(),
		Status:    StatusRinging,
	})

	// 2. Wait for answer or timeout
	// This is tricky. WebRTC signaling happens asynchronously.
	// We can poll the CallRegistry or subscribe to Broker events.
	timeout := time.After(60 * time.Second)
	ticker := time.NewTicker(2 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-d.ctx.Done():
			return
		case <-timeout:
			// Timeout (Not Answered)
			d.srv.broker.endCall(callID, "timeout")
			d.srv.campaigns.UpdateContactStatus(d.ctx, contact.ID, "failed")
			return
		case <-ticker.C:
			// Check Call Status in broker
			rec, ok := d.srv.broker.getCall(callID)
			if !ok {
				// Call ended or rejected before answer
				d.srv.campaigns.UpdateContactStatus(d.ctx, contact.ID, "failed")
				return
			}
			if rec.Status == StatusActive {
				// 3. Contact Answered!
				d.srv.campaigns.UpdateContactStatus(d.ctx, contact.ID, "answered")

				// Trigger FlowBuilder
				if c.FlowID != "" {
					sess.startInboundFlowOnce(callID, peer.String(), "outbound-active")
					
					// Instead of startHoldMusic (which needs an audio file), we inject the flow.
					// The flowExec handles sending messages (or audio nodes) into the chat.
					// NOTE: FlowBuilder currently works via chat messages, not WebRTC audio directly,
					// unless we implement an audio playback node over WebRTC. 
					// The user agreed to trigger a FlowBuilder.
				}
				return
			}
		}
	}
}
