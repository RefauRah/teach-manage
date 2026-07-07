package main

import (
	"database/sql"
	"fmt"
	"log"

	_ "github.com/lib/pq"
)

func main() {
	// Connect to default 'postgres' database first
	dsn := "host=localhost port=5432 user=postgres password=postgres dbname=postgres sslmode=disable"
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		log.Fatalf("Error opening connection: %v", err)
	}
	defer db.Close()

	// Check connection
	if err := db.Ping(); err != nil {
		log.Fatalf("Error pinging default database: %v", err)
	}

	// Create database teaching_management
	_, err = db.Exec("CREATE DATABASE teaching_management")
	if err != nil {
		log.Fatalf("Error creating database: %v", err)
	}

	fmt.Println("Database 'teaching_management' created successfully!")
}
