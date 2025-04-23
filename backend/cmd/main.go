package main

import (
	"Mou-Welfare/api"
	"Mou-Welfare/internal/config"
	"Mou-Welfare/internal/database"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
)

func init() {
	//輸出設定為標準輸出(預設為stderr)
	logrus.SetOutput(os.Stdout)
	//設定要輸出的log等級
	logrus.SetLevel(logrus.DebugLevel)
}

func main() {
	cfg := config.LoadConfig()

	r := gin.Default()

	db, err := database.SetupDatabase(*cfg)
	if err != nil {
		logrus.Fatal("SetUp Database fail", err)
	}

	// 設置路由
	api.SetupRoutes(r, db)
	// 啟動服務
	r.Run(":" + cfg.ServerPort)

}
