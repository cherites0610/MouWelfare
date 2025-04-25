package api

import (
	handler "Mou-Welfare/api/hander"
	"Mou-Welfare/api/middleware"
	"Mou-Welfare/internal/config"
	"Mou-Welfare/internal/repository"
	"Mou-Welfare/internal/service"
	"net/http"
	"os"
	"path/filepath"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
	"gorm.io/gorm"
)

func SetupRoutes(r *gin.Engine, db *gorm.DB, cfg *config.Config, log *logrus.Logger) {
	// 初始化 Repository
	userRepo := repository.NewUserRepository(db)
	familyRepo := repository.NewFamilyRerpository(db)
	welfareRepo := repository.NewWelfareRepo(db)

	// 初始化 Service
	messageService := service.NewMessageService(userRepo, cfg, log)
	verificationService := service.NewVerificationService(userRepo, messageService, cfg)
	authService := service.NewAuthService(userRepo, cfg)
	userService := service.NewUserService(userRepo, verificationService, authService, messageService, cfg, log)
	familyService := service.NewFamilyService(familyRepo, log)
	welfareService := service.NewWelfareService(welfareRepo)

	// 初始化 Handler
	userHandler := handler.NewUserHandler(userService, authService, verificationService, cfg)
	familyHandler := handler.NewFamilyHandler(familyService, userRepo, verificationService, cfg)
	welfareHandler := handler.NewWelfareHandler(welfareService)

	r.GET("/api/fqa", handler.GetFQAHandler)
	r.GET("/api/avatar/:id", userHandler.GetAvatar) // 獲取用戶頭像
	r.GET("/api/LineLoginCallback", userHandler.LineLoginCallback)

	welfare := r.Group("/api/welfare")
	{
		welfare.GET("/", welfareHandler.GetAllWelfares)    // 獲取所有福利
		welfare.GET("/:id", welfareHandler.GetWelfareByID) // 獲取福利詳情
	}

	auth := r.Group("/auth")
	{
		auth.POST("/login", userHandler.Login)                        // 登錄
		auth.POST("/register", userHandler.Register)                  // 註冊
		auth.POST("/verify", userHandler.VerifyEmail)                 // 驗證郵箱
		auth.POST("/send-verify/:email", userHandler.SendVerifyEmail) // 發送驗證郵件
	}

	// 受保護路由
	api := r.Group("/api").Use(middleware.JWTAuth(cfg))
	{
		api.POST("/avatar-upload", userHandler.UploadAvatar) // 上傳頭像

		api.GET("/profile", userHandler.GetUserProfile) // 獲取用戶資料
		api.PUT("/profile", userHandler.UpdateProfile)  // 更新用戶資料

		api.POST("/family", familyHandler.CreateFamily)           // 創建家庭
		api.DELETE("/family/:id", familyHandler.DeleteFamily)     // 刪除家庭
		api.GET("/family/:id", familyHandler.GetFamily)           // 獲取家庭資料
		api.POST("/family/join/:id", familyHandler.JoinFamily)    // 加入家庭
		api.DELETE("/family/leave/:id", familyHandler.ExitFamily) // 離開家庭
		api.GET("/user/family", familyHandler.GetUserFamily)      // 獲取用戶家庭
		api.PUT("/family/:id", familyHandler.UpdateFamily)        // 更新家庭資料
		api.PUT("/family/role/:id", familyHandler.UpdataMember)   // 更新家庭成員角色

		api.POST("/family/:code", familyHandler.JoinFamilyByCode) // 創建加入家庭的邀請碼
		api.GET("/family/:id/code", familyHandler.GetFamilyCode)  // 獲取加入家庭的邀請碼

		api.GET("/lineLoginUrl", userHandler.GetLineLoginUrl)
	}

	r.GET("/uploads/*filepath", func(c *gin.Context) {
		// 獲取請求的文件路徑
		filePath := c.Param("filepath")
		// 構建完整的文件路徑（相對於 ./uploads）
		fullPath := filepath.Join("./uploads", filePath)

		// 檢查文件是否存在
		if _, err := os.Stat(fullPath); os.IsNotExist(err) {
			// 如果文件不存在，返回默認資源
			defaultFile := "./uploads/default_avatar.png" // 假設默認資源是 default.png
			if _, err := os.Stat(defaultFile); err == nil {
				c.File(defaultFile)
				return
			}
			// 如果默認文件也不存在，返回 404
			c.String(http.StatusNotFound, "Default file not found")
			return
		}

		// 如果文件存在，直接返回該文件
		c.File(fullPath)
	})
}
