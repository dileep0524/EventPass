package model

import "time"

type User struct {
	UserID    string    `json:"user_id"`
	FirstName string    `json:"first_name"`
	LastName  string    `json:"last_name"`
	Username  string    `json:"username"`
	Password  string    `json:"password"`
	Phone     string    `json:"phone"`
	Email     string    `json:"email"`
	CreatedAt time.Time `json:"created_at"`
}
type Event struct {
	Event_ID          string    `json:"event_id"`
	Event_Title       string    `json:"title"`
	Event_Description string    `json:"description"`
	Event_Date        time.Time `json:"date"`
	Event_Start_Time  time.Time `json:"start_time"`
	Event_End_Time    time.Time `json:"end_time"`
	Event_Location    string    `json:"location"`
	TotalSlots        int       `json:"total_slots"`
	CreatedBy         string `json:"created_by"`
	CreatedAt         time.Time `json:"created_at"`
}
