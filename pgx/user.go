// pgx/user.go
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

type PostgresRepo struct {
	db *pgxpool.Pool
}

func NewUserRepo(db *pgxpool.Pool) *PostgresRepo {
	return &PostgresRepo{db: db}
}

func CreateUser(ctx context.Context, userID, firstName, lastName, username, password, phone, email string) error {
	query := `INSERT INTO users (user_id, first_name, last_name, username, password, phone, email, created_at) 
			  VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`
	
	if _, err := utils.DB.Exec(ctx, query, userID, firstName, lastName, username, password, phone, email); err != nil {
		return err
	}
	return nil
}

func GetUserByUsername(ctx context.Context, username string) (model.User, error) {
	var user model.User
	query := `SELECT user_id, first_name, last_name, username, password, phone, email, created_at 
			  FROM users WHERE username = $1`
	
	if err := utils.DB.QueryRow(ctx, query, username).Scan(
		&user.UserID,
		&user.FirstName,
		&user.LastName,
		&user.Username,
		&user.Password,
		&user.Phone,
		&user.Email,
		&user.CreatedAt,
	); err != nil {
		if err == pgx.ErrNoRows {
			return model.User{}, status.Errorf(codes.NotFound, "user not found")
		}
		return model.User{}, err
	}
	return user, nil
}

func GetUserByID(ctx context.Context, userID string) (model.User, error) {
	var user model.User
	query := `SELECT user_id, first_name, last_name, username, password, phone, email, created_at 
			  FROM users WHERE user_id = $1`
	
	if err := utils.DB.QueryRow(ctx, query, userID).Scan(
		&user.UserID,
		&user.FirstName,
		&user.LastName,
		&user.Username,
		&user.Password,
		&user.Phone,
		&user.Email,
		&user.CreatedAt,
	); err != nil {
		if err == pgx.ErrNoRows {
			return model.User{}, status.Errorf(codes.NotFound, "user not found")
		}
		return model.User{}, err
	}
	return user, nil
}