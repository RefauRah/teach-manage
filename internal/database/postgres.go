package database

import (
	"fmt"
	"log"
	"os"
	"teaching-management/internal/config"

	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
)

var DB *sqlx.DB

func ConnectDB() {
	cfg := config.AppConfig
	dsn := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		cfg.DBHost, cfg.DBPort, cfg.DBUser, cfg.DBPassword, cfg.DBName, cfg.DBSSLMode)

	var err error
	DB, err = sqlx.Connect("postgres", dsn)
	if err != nil {
		log.Fatalf("Error connecting to database: %v", err)
	}

	log.Println("Database connection successfully established")
	
	// Run migrations
	runMigrations()
}

func runMigrations() {
	migrationPath := "internal/database/migrations/001_init.sql"
	content, err := os.ReadFile(migrationPath)
	if err != nil {
		log.Printf("Warning: failed to read migration file %s: %v", migrationPath, err)
		return
	}

	_, err = DB.Exec(string(content))
	if err != nil {
		log.Fatalf("Error executing migration: %v", err)
	}

	log.Println("Database migrations executed successfully")
}

