// cmd/main.go
package main

import (
	"context"
	"fmt"
	"log"
	"net"
	"net/http"

	"eventpass/service"
	"eventpass/proto/gen"
	"eventpass/utils"

	"github.com/grpc-ecosystem/grpc-gateway/v2/runtime"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

func main() {
	// Initialize database
	if err := utils.InitDB(); err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer utils.CloseDB()

	// Start gRPC server in a goroutine
	go startGRPCServer()

	// Start HTTP gateway server
	startHTTPGateway()
}

func startGRPCServer() {
	lis, err := net.Listen("tcp", ":50051")
	if err != nil {
		log.Fatalf("Failed to listen on port 50051: %v", err)
	}

	grpcServer := grpc.NewServer()

	// Register services
	userHandler := service.NewUserHandler()
	eventHandler := service.NewEventHandler()

	gen.RegisterUserServiceServer(grpcServer, userHandler)
	gen.RegisterEventServiceServer(grpcServer, eventHandler)

	log.Println("gRPC server starting on :50051")
	if err := grpcServer.Serve(lis); err != nil {
		log.Fatalf("Failed to serve gRPC server: %v", err)
	}
}

func startHTTPGateway() {
	ctx := context.Background()
	ctx, cancel := context.WithCancel(ctx)
	defer cancel()

	// Create a gRPC-Gateway mux
	mux := runtime.NewServeMux(
		runtime.WithMarshalerOption(runtime.MIMEWildcard, &runtime.JSONPb{}),
	)

	// Register gRPC services to the gateway
	opts := []grpc.DialOption{grpc.WithTransportCredentials(insecure.NewCredentials())}

	err := gen.RegisterUserServiceHandlerFromEndpoint(ctx, mux, "localhost:50051", opts)
	if err != nil {
		log.Fatalf("Failed to register user service handler: %v", err)
	}

	err = gen.RegisterEventServiceHandlerFromEndpoint(ctx, mux, "localhost:50051", opts)
	if err != nil {
		log.Fatalf("Failed to register event service handler: %v", err)
	}

	// Create HTTP server with CORS
	httpMux := http.NewServeMux()

	// Add CORS middleware
	httpMux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		// Enable CORS
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		mux.ServeHTTP(w, r)
	})

	// Serve static files (optional)
	httpMux.Handle("/static/", http.StripPrefix("/static/", http.FileServer(http.Dir("./static/"))))

	fmt.Println("HTTP Gateway server starting on :8080")
	fmt.Println("Access the API at: http://localhost:8080")

	if err := http.ListenAndServe(":8080", httpMux); err != nil {
		log.Fatalf("Failed to start HTTP gateway server: %v", err)
	}
}
