package service

import (
	"context"
	repository "eventpass/pgx"
	userpb "eventpass/proto/gen"
	"log"
	"strings"

	"github.com/google/uuid"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// EventServiceServer implements the gRPC server for event services.
type EventServiceServer struct {
	userpb.UnimplementedEventServiceServer
}

func (*EventServiceServer) NewEvent(ctx context.Context, req *userpb.CreateEventRequest) (*userpb.CreateEventResponse, error) {
	if req == nil {
		return nil, status.Errorf(codes.InvalidArgument, "request is nil")
	}
	eventID := uuid.New().String()
	err := repository.CreateEvent(ctx, eventID,
		req.GetEventTitle(), req.GetEventDescription(), req.GetEventLocation(), req.GetEventDate(), req.GetEventStartTime(), req.GetEventEndTime(), req.GetCreatedBy(), req.GetTotalSlots())
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to create event: %v", err)
	}
	return &userpb.CreateEventResponse{
		Message: "Event created successfully",
	}, nil
}

func (*EventServiceServer) GetEventDetails(ctx context.Context, req *userpb.GetEventRequest) (*userpb.GetEventResponse, error) {

	eventID := strings.TrimSpace(req.GetEventId())

	event, err := repository.GetEvent(ctx, eventID)
	if err != nil {
		log.Printf("GetEvent query error for event_id '%s': %v", eventID, err)
		return nil, status.Errorf(codes.NotFound, "event not found")
	}
	return &userpb.GetEventResponse{
		EventId:          event.Event_ID,
		EventTitle:       event.Event_Title,
		EventDescription: event.Event_Description,
		EventLocation:    event.Event_Location,
		EventDate:        event.Event_Date.Format("2006-01-02"),
		EventStartTime:   event.Event_Start_Time.Format("15:04:05"),
		EventEndTime:     event.Event_End_Time.Format("15:04:05"),
		TotalSlots:       int32(event.TotalSlots),
	}, nil
}
