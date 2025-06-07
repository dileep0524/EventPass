// utils/db.go
package utils

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
)

var DB *pgxpool.Pool

func InitDB() error {
	// Get database configuration from environment variables
	dbHost := getEnv("DB_HOST", "localhost")
	dbPort := getEnv("DB_PORT", "5432")
	dbUser := getEnv("DB_USER", "dileep")
	dbPassword := getEnv("DB_PASSWORD", "kusuma123")
	dbName := getEnv("DB_NAME", "Eventpass")

	// Create connection string
	dsn := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		dbHost, dbPort, dbUser, dbPassword, dbName)

	// Create connection pool
	config, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		return fmt.Errorf("failed to parse database config: %w", err)
	}

	DB, err = pgxpool.NewWithConfig(context.Background(), config)
	if err != nil {
		return fmt.Errorf("failed to create connection pool: %w", err)
	}

	// Test the connection
	if err := DB.Ping(context.Background()); err != nil {
		return fmt.Errorf("failed to ping database: %w", err)
	}

	log.Println("Successfully connected to database")

	// Create tables if they don't exist
	if err := createTables(); err != nil {
		return fmt.Errorf("failed to create tables: %w", err)
	}

	return nil
}

func CloseDB() {
	if DB != nil {
		DB.Close()
		log.Println("Database connection closed")
	}
}

func createTables() error {
	ctx := context.Background()

	// Create users table
	userTable := `
	CREATE TABLE IF NOT EXISTS users (
		user_id VARCHAR(36) PRIMARY KEY,
		first_name VARCHAR(100) NOT NULL,
		last_name VARCHAR(100) NOT NULL,
		username VARCHAR(50) UNIQUE NOT NULL,
		password VARCHAR(255) NOT NULL,
		phone VARCHAR(15) NOT NULL,
		email VARCHAR(100) UNIQUE NOT NULL,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);`

	if _, err := DB.Exec(ctx, userTable); err != nil {
		return fmt.Errorf("failed to create users table: %w", err)
	}

	// Create events table
	eventTable := `
	CREATE TABLE IF NOT EXISTS events (
		event_id VARCHAR(36) PRIMARY KEY,
		event_title VARCHAR(200) NOT NULL,
		event_description TEXT,
		event_location VARCHAR(255) NOT NULL,
		event_date DATE NOT NULL,
		event_start_time TIME NOT NULL,
		event_end_time TIME NOT NULL,
		created_by VARCHAR(100) NOT NULL,
		total_slots INTEGER NOT NULL DEFAULT 0,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);`

	if _, err := DB.Exec(ctx, eventTable); err != nil {
		return fmt.Errorf("failed to create events table: %w", err)
	}

	log.Println("Database tables created successfully")
	return nil
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}