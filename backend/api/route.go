package api

import (
	handler "Mou-Welfare/api/hander"
	"Mou-Welfare/api/middleware"
	"Mou-Welfare/internal/config"
	"Mou-Welfare/internal/repository"
	"Mou-Welfare/internal/service"

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
	familyHandler := handler.NewFamilyHandler(*familyService, *userRepo, verificationService)
	welfareHandler := handler.NewWelfareHandler(welfareService)

	r.Static("/uploads", "./uploads")

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
}
