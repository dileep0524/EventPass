package repository

import (
	"context"
	"eventpass/model"
)

type EventRepository interface {
	CreateEvent(ctx context.Context, eventID, eventTitle, eventDescription, eventLocation, eventDate, eventStartTime, eventEndTime, CreatedBy string, totalSlots int32) error
	GetEvent(ctx context.Context, eventID string) (model.Event, error)
}
