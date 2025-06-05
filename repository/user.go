package repository

import (
	"context"
	"eventpass/model"
	"eventpass/utils"
)

func CreateUser(ctx context.Context, email, hash string) error {
	query := `INSERT INTO users (email, password_hash) VALUES ($1, $2)`
	_, err := utils.DB.Exec(ctx, query, email, hash)
	return err
}
