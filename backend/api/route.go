package api

import (
	handler "Mou-Welfare/api/hander"
	"Mou-Welfare/api/middleware"
	"Mou-Welfare/internal/repository"
	"Mou-Welfare/internal/service"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func SetupRoutes(r *gin.Engine, db *gorm.DB) {
	// 初始化 Repository
	userRepo := repository.NewUserRepository(db)
	familyRepo := repository.NewFamilyRerpository(db)
	welfareRepo := repository.NewWelfareRepo(db)

	// 初始化 Service
	verificationService := service.NewVerificationService(userRepo)
	authService := service.NewAuthService(userRepo)
	userService := service.NewUserService(userRepo, verificationService, authService)
	familyService := service.NewFamilyService(familyRepo)
	welfareService := service.NewWelfareService(welfareRepo)

	// 初始化 Handler
	verificationHandler := handler.NewVerificationHandler(verificationService)
	userHandler := handler.NewUserHandler(*userService, authService)
	familyHandler := handler.NewFamilyHandler(*familyService, *userRepo)
	welfareHandler := handler.NewWelfareHandler(welfareService)

	r.GET("/api/fqa", handler.GetFQAHandler)
	r.GET("/api/LineLoginCallback", userHandler.LineLoginCallback)

	welfare := r.Group("/api/welfare")
	{
		welfare.GET("/", welfareHandler.GetAllWelfares)    // 獲取所有福利
		welfare.GET("/:id", welfareHandler.GetWelfareByID) // 獲取福利詳情
	}

	auth := r.Group("/auth")
	{
		auth.POST("/login", userHandler.Login)                 // 登錄
		auth.POST("/register", userHandler.Register)           // 註冊
		auth.POST("/code", verificationHandler.SendVerifyCode) // 發送驗證碼
		auth.POST("/verify", verificationHandler.VerifyCode)   // 驗證驗證碼
	}

	// 受保護路由
	api := r.Group("/api").Use(middleware.JWTAuth())
	{
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

		api.GET("/lineLoginUrl", userHandler.GetLineLoginUrl)
	}
}
