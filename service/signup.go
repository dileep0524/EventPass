package service

import (
	"context"
	repository "eventpass/pgx"
	userpb "eventpass/proto/gen"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

type UserServiceServer struct {
	userpb.UnimplementedUserServiceServer
	repo repository.PostgresRepo
}

func (s *UserServiceServer) RegisterUser(ctx context.Context, req *userpb.RegisterRequest) (*userpb.RegisterResponse, error) {
	// Hash the password
	hashed, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	// Generate a unique ID for the user
	userID := uuid.New().String()

	// Save user to the database
	err = s.repo.CreateUser(ctx, userID, req.Email, string(hashed), req.FirstName, req.LastName, req.Username, req.Phone)
	if err != nil {
		return nil, err
	}

	return &userpb.RegisterResponse{
		Id:      userID,
		Message: "User registered successfully",
	}, nil
}
