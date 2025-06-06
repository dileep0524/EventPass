package main

import (
	"log"
	"net"
	"os"

	"eventpass/service"
	"eventpass/utils"
	userpb "eventpass/proto/gen"

	"google.golang.org/grpc"
)

func main() {
	// Load environment variables
	utils.LoadEnv()

	// Initialize DB connection
	if err := utils.InitPostgres(); err != nil {
		log.Fatalf("failed to initialize database: %v", err)
	}

	// Set up gRPC server
	listener, err := net.Listen("tcp", ":"+os.Getenv("PORT"))
	if err != nil {
		log.Fatalf("failed to listen: %v", err)
	}
	grpcServer := grpc.NewServer()

	// Register the UserService
	userpb.RegisterUserServiceServer(grpcServer, &service.UserServiceServer{})

	// Register the EventService
	userpb.RegisterEventServiceServer(grpcServer, &service.EventServiceServer{})

	log.Printf("gRPC server listening on port %s", os.Getenv("PORT"))
	if err := grpcServer.Serve(listener); err != nil {
		log.Fatalf("failed to serve: %v", err)
	}
}
