package repository

import (
	"context"
	"eventpass/model"
	"eventpass/utils"

	"github.com/jackc/pgx"
	"github.com/jackc/pgx/v5/pgxpool"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

func NewEventRepo(db *pgxpool.Pool) *PostgresRepo {
	return &PostgresRepo{db: db}
}

func CreateEvent(ctx context.Context, eventID, eventTitle, eventDescription, eventLocation, eventDate, eventStartTime, eventEndTime, CreatedBy string, totalSlots int32) error {
	query := `INSERT INTO events (event_id, event_title, event_description, event_location, event_date, event_start_time, event_end_time,created_by, total_slots) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`
	if _, err := utils.DB.Exec(ctx, query, eventID, eventTitle, eventDescription, eventLocation, eventDate, eventStartTime, eventEndTime, CreatedBy, totalSlots); err != nil {
		return err
	}
	return nil
}

func GetEvent(ctx context.Context, eventID string) (model.Event, error) {
	var event model.Event
	query := `SELECT event_id, event_title, event_description, event_location, event_date, event_start_time, event_end_time, created_by, total_slots FROM events WHERE event_id = $1`
	if err := utils.DB.QueryRow(ctx, query, eventID).Scan(
		&event.Event_ID,
		&event.Event_Title,
		&event.Event_Description,
		&event.Event_Location,
		&event.Event_Date,
		&event.Event_Start_Time,
		&event.Event_End_Time,
		&event.CreatedBy,
		&event.TotalSlots,
	); err != nil {
		if err == pgx.ErrNoRows {
			return model.Event{}, status.Errorf(codes.NotFound, "event not found")
		}
		return model.Event{}, err
	}
	return event, nil
}
