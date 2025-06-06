package service

import (
	"context"
	userpb "eventpass/proto/gen"

	"golang.org/x/crypto/bcrypt"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

func (s *UserServiceServer) LoginUser(ctx context.Context, req *userpb.LoginRequest) (*userpb.LoginResponse, error) {

	user, err := s.repo.GetUser(ctx, req.GetUserId())
	if err != nil {
		return nil, status.Errorf(codes.NotFound, "user not found")
	}

	err = bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password))
	if err != nil {
		return nil, status.Errorf(codes.Unauthenticated, "invalid password")
	}

	return &userpb.LoginResponse{
		Message: "Login Successful",
	}, nil
}
