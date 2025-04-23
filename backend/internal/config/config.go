package config

import (
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	DOMAIN     string
	ServerPort string
	DBHost     string
	DBUrl      string
	DBUser     string
	DBPassword string
}

func LoadConfig() *Config {
	godotenv.Load()
	return &Config{
		DOMAIN:     getEnv("DOMAIN", "localhost"),
		ServerPort: getEnv("SERVER_POST", "8080"),
		DBHost:     getEnv("DATABASE_HOST", "3306"),
		DBUrl:      getEnv("DATABASE_URL", "localhost"),
		DBUser:     getEnv("DATABASE_USER", "root"),
		DBPassword: getEnv("DATABASE_PASSWORD", "123456"),
	}
}

func getEnv(key, defaultValue string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return defaultValue
}
