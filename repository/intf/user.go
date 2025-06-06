package repository

import (
	"context"
	"eventpass/model"
)

type UserRepository interface {
	CreateUser(ctx context.Context, userID, email, password, firstName, lastName, username, phone string) error
	GetUser(ctx context.Context, userID string) (model.User, error)
}