package config

import (
	"log"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	Port                   string
	DBHost                 string
	DBPort                 string
	DBUser                 string
	DBPassword             string
	DBName                 string
	DBSSLMode              string
	JWTSecret              string
	JWTRefreshSecret       string
	JWTAccessExpiryMin     int
	JWTRefreshExpiryDays   int
	DBMode                 string
	SupabaseURL            string
	SupabaseAnonKey        string
}

var AppConfig *Config

func LoadConfig() {
	// Try loading from .env file, but do not fail if it doesn't exist (e.g. in prod)
	if err := godotenv.Load(); err != nil {
		log.Println("Warning: .env file not found, loading from environment variables")
	}

	AppConfig = &Config{
		Port:                 getEnv("PORT", "3000"),
		DBHost:               getEnv("DB_HOST", "localhost"),
		DBPort:               getEnv("DB_PORT", "5432"),
		DBUser:               getEnv("DB_USER", "postgres"),
		DBPassword:           getEnv("DB_PASSWORD", "postgres"),
		DBName:               getEnv("DB_NAME", "teaching_management"),
		DBSSLMode:            getEnv("DB_SSLMODE", "disable"),
		JWTSecret:            getEnv("JWT_SECRET", "supersecretkeychangeinproduction"),
		JWTRefreshSecret:     getEnv("JWT_REFRESH_SECRET", "anothersecretkeychangeinproduction"),
		JWTAccessExpiryMin:   getEnvAsInt("JWT_ACCESS_EXPIRY_MINUTES", 60),
		JWTRefreshExpiryDays: getEnvAsInt("JWT_REFRESH_EXPIRY_DAYS", 7),
		DBMode:               getEnv("DB_MODE", "postgres"),
		SupabaseURL:          getEnv("SUPABASE_URL", ""),
		SupabaseAnonKey:      getEnv("SUPABASE_ANON_KEY", ""),
	}
}

func getEnv(key, defaultValue string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return defaultValue
}

func getEnvAsInt(key string, defaultValue int) int {
	valueStr := getEnv(key, "")
	if valueStr == "" {
		return defaultValue
	}
	value, err := strconv.Atoi(valueStr)
	if err != nil {
		return defaultValue
	}
	return value
}
