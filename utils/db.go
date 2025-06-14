package utils

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
)

var DB *pgxpool.Pool

// InitDB initializes the PostgreSQL database connection pool
func InitDB() error {
	// Use DATABASE_URL if available (Render, Heroku-style)
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL != "" {
		log.Println("Using DATABASE_URL from environment")
		return initDBFromURL(databaseURL)
	}

	// Fallback to individual env vars (for local/dev)
	dbHost := getEnv("DB_HOST", "localhost")
	dbPort := getEnv("DB_PORT", "5432")
	dbUser := getEnv("DB_USER", "dileep")
	dbPassword := getEnv("DB_PASSWORD", "kusuma123")
	dbName := getEnv("DB_NAME", "Eventpass")

	dsn := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		dbHost, dbPort, dbUser, dbPassword, dbName)

	return initDBFromURL(dsn)
}

// initDBFromURL sets up the DB connection pool and pings it
func initDBFromURL(dsn string) error {
	config, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		return fmt.Errorf("failed to parse database config: %w", err)
	}

	DB, err = pgxpool.NewWithConfig(context.Background(), config)
	if err != nil {
		return fmt.Errorf("failed to create connection pool: %w", err)
	}

	if err := DB.Ping(context.Background()); err != nil {
		return fmt.Errorf("failed to ping database: %w", err)
	}

	log.Println("✅ Successfully connected to database")
	return createTables()
}

// CloseDB closes the DB connection pool
func CloseDB() {
	if DB != nil {
		DB.Close()
		log.Println("🔌 Database connection closed")
	}
}

// createTables creates required tables if they don't exist
func createTables() error {
	ctx := context.Background()

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

	eventTable := `
		CREATE TABLE IF NOT EXISTS events (
			event_id VARCHAR(36) PRIMARY KEY,
			title VARCHAR(200) NOT NULL,
			description TEXT,
			location VARCHAR(255) NOT NULL,
			date DATE NOT NULL,
			start_time TIME NOT NULL,
			end_time TIME NOT NULL,
			created_by VARCHAR(100) NOT NULL,
			total_slots INTEGER NOT NULL DEFAULT 0,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		);`

	adminTable := `
		CREATE TABLE IF NOT EXISTS admins (
			admin_id VARCHAR(36) PRIMARY KEY,
			first_name VARCHAR(100) NOT NULL,
			last_name VARCHAR(100) NOT NULL,
			username VARCHAR(50) UNIQUE NOT NULL,
			password VARCHAR(255) NOT NULL,
			phone VARCHAR(15) NOT NULL,
			email VARCHAR(100) UNIQUE NOT NULL,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		);`

	for _, query := range []string{userTable, eventTable, adminTable} {
		if _, err := DB.Exec(ctx, query); err != nil {
			return fmt.Errorf("failed to execute table creation query: %w", err)
		}
	}

	log.Println("🛠️ Tables ensured successfully")
	return nil
}

// getEnv retrieves environment variable or default
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
