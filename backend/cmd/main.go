package main

import (
	"Mou-Welfare/api"
	"Mou-Welfare/internal/config"
	"Mou-Welfare/internal/database"
	"Mou-Welfare/internal/logger"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
)

func main() {
	cfg := config.LoadConfig()

	log := logger.NewLogrusLogger(cfg)

	r := gin.Default()

	db, err := database.SetupDatabase(*cfg, log)
	if err != nil {
		logrus.Fatal("SetUp Database fail", err)
	}

	// 檢查 uploads 目錄是否存在，若不存在則創建
	if _, err := os.Stat(cfg.AVATAR_PATH); os.IsNotExist(err) {
		os.Mkdir(cfg.AVATAR_PATH, 0755)
	}

	// 設置路由
	api.SetupRoutes(r, db, cfg, log)
	// 啟動服務
	r.Run(":" + cfg.ServerPort)

}
