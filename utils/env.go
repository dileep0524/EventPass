package utils

import (
	"log"

	"github.com/joho/godotenv"
)

func LoadEnv() {
	err := godotenv.Load("env/.env")
	if err != nil {
		log.Printf("Error loading .env file: %v", err)
	}
}
