package config

import (
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	DOMAIN                       string
	ServerPort                   string
	TOKEN_SERCRET                string
	DBHost                       string
	DBUrl                        string
	DBUser                       string
	DBPassword                   string
	LINE_CHANNEL_ACCESS_TOKEN    string
	LINE_CHANNEL_SECRET          string
	LINE_CLIENT_ID               string
	LINE_SEND_MESSAGE_APIURL     string
	LINE_TOKEN_APIURL            string
	LINE_USER_PROFILE_APIURL     string
	SMTP_HOST                    string
	SMTP_PORT                    string
	SMTP_USER                    string
	SMTP_PASSWORD                string
	SMTP_FROM                    string
	TOKEN_EXPIRES_IN             int64
	VERIFICATION_CODE_EXPIRES_IN int64
	LOG_LEVEL                    string
	LOG_FILE_PATH                string
}

func LoadConfig() *Config {
	err := godotenv.Load("../.env")
	if err != nil {
		panic("Error loading .env file")
	}
	return &Config{
		DOMAIN:                       getEnv("DOMAIN", "localhost"),
		ServerPort:                   getEnv("SERVER_POST", "8080"),
		TOKEN_SERCRET:                getEnv("TOKEN_SERCRET", "123456"),
		DBHost:                       getEnv("DATABASE_HOST", "3306"),
		DBUrl:                        getEnv("DATABASE_URL", "localhost"),
		DBUser:                       getEnv("DATABASE_USER", "root"),
		DBPassword:                   getEnv("DATABASE_PASSWORD", "123456"),
		LINE_CHANNEL_ACCESS_TOKEN:    getEnv("LINE_CHANNEL_ACCESS_TOKEN", ""),
		LINE_CHANNEL_SECRET:          getEnv("LINE_CHANNEL_SECRET", ""),
		LINE_CLIENT_ID:               getEnv("LINE_CLIENT_ID", ""),
		LINE_SEND_MESSAGE_APIURL:     getEnv("LINE_SEND_MESSAGE_APIURL", "https://api.line.me/v2/bot/message/push"),
		LINE_TOKEN_APIURL:            getEnv("LINE_TOKEN_APIURL", "https://api.line.me/oauth2/v2.1/token"),
		LINE_USER_PROFILE_APIURL:     getEnv("LINE_USER_PROFILE_APIURL", "https://api.line.me/v2/profile"),
		SMTP_HOST:                    getEnv("SMTP_HOST", "smtp.example.com"),
		SMTP_PORT:                    getEnv("SMTP_PORT", "587"),
		SMTP_USER:                    getEnv("SMTP_USER", ""),
		SMTP_PASSWORD:                getEnv("SMTP_PASSWORD", ""),
		SMTP_FROM:                    getEnv("SMTP_FROM", ""),
		TOKEN_EXPIRES_IN:             parseEnvToInt64("TOKEN_EXPIRES_IN", "3600"),
		VERIFICATION_CODE_EXPIRES_IN: parseEnvToInt64("VERIFICATION_CODE_EXPIRES_IN", "300"),
		LOG_LEVEL:                    getEnv("LOG_LEVEL", "debug"),
		LOG_FILE_PATH:                getEnv("LOG_FILE_PATH", "app.log"),
	}
}

func getEnv(key, defaultValue string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return defaultValue
}

func parseEnvToInt64(key, defaultValue string) int64 {
	valueStr := getEnv(key, defaultValue)
	valueInt, err := strconv.ParseInt(valueStr, 10, 64)
	if err != nil {
		return 0 // or handle the error as needed
	}
	return valueInt
}
