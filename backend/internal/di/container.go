package di

import (
	handler "Mou-Welfare/api/hander"
	"Mou-Welfare/internal/config"
	"Mou-Welfare/internal/repository"
	"Mou-Welfare/internal/service"

	"github.com/sirupsen/logrus"
	"gorm.io/gorm"
)

// Container 定義依賴容器結構
type Container struct {
	UserHandler    *handler.UserHandler
	FamilyHandler  *handler.FamilyHandler
	WelfareHandler *handler.WelfareHandler
}

// NewContainer 初始化依賴容器
func NewContainer(db *gorm.DB, cfg *config.Config, log *logrus.Logger) *Container {
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
	welfareHandler := handler.NewWelfareHandler(welfareService, familyService, userService, cfg)

	return &Container{
		UserHandler:    userHandler,
		FamilyHandler:  familyHandler,
		WelfareHandler: welfareHandler,
	}
}
