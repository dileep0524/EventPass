package service

import (
	"context"
	"eventpass/proto/gen"
	"eventpass/pgx"
	"log"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type UserHandler struct {
	gen.UnimplementedUserServiceServer
}

func NewUserHandler() *UserHandler {
	return &UserHandler{}
}

func (h *UserHandler) RegisterUser(ctx context.Context, req *gen.RegisterRequest) (*gen.RegisterResponse, error) {
	// Generate user ID
	userID := uuid.New().String()

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		log.Printf("Failed to hash password: %v", err)
		return nil, status.Errorf(codes.Internal, "failed to process password")
	}

	// Create user in database
	err = repository.CreateUser(ctx, userID, req.FirstName, req.LastName, req.Username, string(hashedPassword), req.Phone, req.Email)
	if err != nil {
		log.Printf("Failed to create user: %v", err)
		return nil, status.Errorf(codes.Internal, "failed to create user")
	}

	return &gen.RegisterResponse{
		Id:      userID,
		Message: "User registered successfully",
	}, nil
}

