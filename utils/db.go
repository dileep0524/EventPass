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
	// First try using DATABASE_URL (for Render or production)
	if databaseURL := os.Getenv("DATABASE_URL"); databaseURL != "" {
		log.Println("Using DATABASE_URL from environment")
		config, err := pgxpool.ParseConfig(databaseURL)
		if err != nil {
			return fmt.Errorf("failed to parse DATABASE_URL: %w", err)
		}
		DB, err = pgxpool.NewWithConfig(context.Background(), config)
		if err != nil {
			return fmt.Errorf("failed to connect using DATABASE_URL: %w", err)
		}
		if err := DB.Ping(context.Background()); err != nil {
			return fmt.Errorf("failed to ping database: %w", err)
		}
		log.Println("✅ Connected to database using DATABASE_URL")
		return createTables()
	}

	// Otherwise use local env vars
	log.Println("Using local environment variables for DB config")
	dbHost := getEnv("DB_HOST", "localhost")
	dbPort := getEnv("DB_PORT", "5432")
	dbUser := getEnv("DB_USER", "dileep")
	dbPassword := getEnv("DB_PASSWORD", "kusuma123")
	dbName := getEnv("DB_NAME", "Eventpass")

	dsn := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		dbHost, dbPort, dbUser, dbPassword, dbName)

	config, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		return fmt.Errorf("failed to parse local database config: %w", err)
	}

	DB, err = pgxpool.NewWithConfig(context.Background(), config)
	if err != nil {
		return fmt.Errorf("failed to create connection pool: %w", err)
	}

	if err := DB.Ping(context.Background()); err != nil {
		return fmt.Errorf("failed to ping local database: %w", err)
	}

	log.Println("✅ Connected to local database")
	return createTables()
}

func CloseDB() {
	if DB != nil {
		DB.Close()
		log.Println("Database connection closed")
	}
}

func createTables() error {
	ctx := context.Background()

	// Users table
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

	// Events table
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

	log.Println("✅ Database tables created successfully")
	return nil
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
