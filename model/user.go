package model

import "time"

type User struct {
	ID            string    `json:"id"`
	Email         string    `json:"email"`
	PasswordHash  string    `json:"-"`
	TOTPSecret    string    `json:"-"`
	RecoveryCodes []string  `json:"-"`
	CreatedAt     time.Time `json:"created_at"`
}
