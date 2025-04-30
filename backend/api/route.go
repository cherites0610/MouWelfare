package api

import (
	handler "Mou-Welfare/api/hander"
	"Mou-Welfare/api/middleware"
	"Mou-Welfare/internal/config"
	"Mou-Welfare/internal/di"
	"net/http"
	"os"
	"path/filepath"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
	"gorm.io/gorm"
)

func SetupRoutes(r *gin.Engine, db *gorm.DB, cfg *config.Config, log *logrus.Logger) {
	// 初始化依賴容器
	container := di.NewContainer(db, cfg, log)

	// 公開路由
	r.GET("/api/fqa", handler.GetFQAHandler)
	r.GET("/api/avatar/:id", container.UserHandler.GetAvatar)
	r.GET("/api/LineLoginCallback", container.UserHandler.LineLoginCallback)

	// 福利相關路由
	welfare := r.Group("/api/welfare")
	{
		welfare.GET("/", container.WelfareHandler.GetAllWelfares)
		welfare.GET("/:id", container.WelfareHandler.GetWelfareByID)
	}

	// 認證相關路由
	auth := r.Group("/auth")
	{
		auth.POST("/login", container.UserHandler.Login)
		auth.POST("/register", container.UserHandler.Register)
		//這是註冊的
		auth.POST("/verify", container.UserHandler.VerifyEmail)
		auth.POST("/send-verify/:email", container.UserHandler.SendVerifyEmail)
		//這是申請二級驗證
		auth.POST("/send-userverify/:email", container.UserHandler.GetUserVerifyMessage)
		auth.POST("/userverify", container.UserHandler.Verify)
	}

	// 受保護路由
	api := r.Group("/api").Use(middleware.JWTAuth(cfg))
	{
		api.POST("/avatar-upload", container.UserHandler.UploadAvatar)
		api.GET("/profile", container.UserHandler.GetUserProfile)
		api.PUT("/profile", container.UserHandler.UpdateProfile)
		api.GET("/favorite", container.WelfareHandler.FindFavoritesByUserID)
		api.POST("/favorite/:id", container.WelfareHandler.AddFavorite)
		api.DELETE("/favorite/:id", container.WelfareHandler.DeleteFavorite)
		api.PUT("profile/:password", container.UserHandler.UpdataPassword)

		api.POST("/family", container.FamilyHandler.CreateFamily)
		api.DELETE("/family/:id", container.FamilyHandler.DeleteFamily)
		api.GET("/family/:id", container.FamilyHandler.GetFamily)
		api.POST("/family/join/:id", container.FamilyHandler.JoinFamily)
		api.DELETE("/family/leave/:id", container.FamilyHandler.ExitFamily)
		api.GET("/user/family", container.FamilyHandler.GetUserFamily)
		api.PUT("/family/:id", container.FamilyHandler.UpdateFamily)
		api.PUT("/family/role/:id", container.FamilyHandler.UpdataMember)

		api.POST("/family/:code", container.FamilyHandler.JoinFamilyByCode)
		api.GET("/family/:id/code", container.FamilyHandler.GetFamilyCode)

		api.GET("/lineLoginUrl", container.UserHandler.GetLineLoginUrl)
	}

	// 文件服務
	r.GET("avatar/*filepath", func(c *gin.Context) {
		filePath := c.Param("filepath")
		fullPath := filepath.Join(cfg.AVATAR_PATH, filePath)

		if _, err := os.Stat(fullPath); os.IsNotExist(err) {
			defaultFile := "../../avatar/default_avatar.png"

			if _, err := os.Stat(defaultFile); err == nil {
				c.File(defaultFile)
				return
			}
			c.String(http.StatusNotFound, "Default file not found")
			return
		}

		c.File(fullPath)
	})
}
