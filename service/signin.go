package service

import (
	"context"
	repository "eventpass/pgx"
	"eventpass/proto/gen"
	"log"

	"golang.org/x/crypto/bcrypt"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

func (h *UserHandler) Login(ctx context.Context, req *gen.LoginRequest) (*gen.LoginResponse, error) {
	// Get user from database
	user, err := repository.GetUserByUsername(ctx, req.Username)
	if err != nil {
		log.Printf("Failed to get user: %v", err)
		return nil, status.Errorf(codes.NotFound, "invalid credentials")
	}

	// Verify password
	err = bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password))
	if err != nil {
		return nil, status.Errorf(codes.InvalidArgument, "invalid credentials")
	}

	return &gen.LoginResponse{
		Message: "Login successful",
	}, nil
}
