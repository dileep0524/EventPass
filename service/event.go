
package service

import (
	"context"
	pgx "eventpass/pgx"
	"eventpass/proto/gen"
	"log"

	"github.com/google/uuid"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type EventHandler struct {
	gen.UnimplementedEventServiceServer
}

func NewEventHandler() *EventHandler {
	return &EventHandler{}
}

func (h *EventHandler) CreateEvent(ctx context.Context, req *gen.CreateEventRequest) (*gen.CreateEventResponse, error) {
	// Generate event ID
	eventID := uuid.New().String()

	// Create event in database
	err := pgx.CreateEvent(
		ctx,
		eventID,
		req.EventTitle,
		req.EventDescription,
		req.EventLocation,
		req.EventDate,
		req.EventStartTime,
		req.EventEndTime,
		req.CreatedBy,
		req.TotalSlots,
	)
	if err != nil {
		log.Printf("Failed to create event: %v", err)
		return nil, status.Errorf(codes.Internal, "failed to create event")
	}

	return &gen.CreateEventResponse{
		Message: "Event created successfully",
	}, nil
}

func (h *EventHandler) GetEventDetails(ctx context.Context, req *gen.GetEventRequest) (*gen.GetEventResponse, error) {
	// Get event from database
	event, err := pgx.GetEvent(ctx, req.EventId)
	if err != nil {
		log.Printf("Failed to get event: %v", err)
		return nil, status.Errorf(codes.NotFound, "event not found")
	}

	return &gen.GetEventResponse{
		EventId:          event.Event_ID,
		EventTitle:       event.Event_Title,
		EventDescription: event.Event_Description,
		EventLocation:    event.Event_Location,
		EventDate:        event.Event_Date.Format("2006-01-02"),
		EventStartTime:   event.Event_Start_Time.Format("15:04:05"),
		EventEndTime:     event.Event_End_Time.Format("15:04:05"),
		CreatedBy:        event.CreatedBy,
		TotalSlots:       int32(event.TotalSlots),
	}, nil
}
