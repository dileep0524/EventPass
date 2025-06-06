package repository

import (
	"context"
	"eventpass/model"
	"eventpass/utils"

	"github.com/jackc/pgx/v5/pgxpool"
)

type PostgresRepo struct {
	db *pgxpool.Pool
}
func NewUserRepo(db *pgxpool.Pool) *PostgresRepo {
	return &PostgresRepo{db: db}
}

func(r *PostgresRepo) CreateUser(ctx context.Context, userID, email, password, firstName, lastName, username, phone string) error {
	query := `INSERT INTO users (user_id, email, password, first_name, last_name, username, phone) VALUES ($1, $2, $3, $4, $5, $6, $7)`
	if _, err := utils.DB.Exec(ctx, query, userID, email, password, firstName, lastName, username, phone); err != nil {
		return err
	}
	return nil
}

func(r *PostgresRepo) GetUser(ctx context.Context, userID string) (model.User, error) {
	var user model.User
	query := `SELECT user_id, email, password, first_name, last_name, username, phone, created_at FROM users WHERE user_id = $1`
	if err := utils.DB.QueryRow(ctx, query, userID).Scan(&user.UserID, &user.Email,
		&user.Password, &user.FirstName, &user.LastName, &user.Username, &user.Phone, &user.CreatedAt); err != nil {
		return model.User{}, err
	}
	return user, nil
}
