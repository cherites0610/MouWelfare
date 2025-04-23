package service

import (
	"Mou-Welfare/internal/config"
	"Mou-Welfare/internal/models"
	"Mou-Welfare/internal/repository"
	"math/rand"

	"sync"
	"time"
)

type VerificationCode struct {
	Code      string
	Data      models.CodeData
	ExpiresAt time.Time
}

type VerificationService struct {
	codes          map[string]*VerificationCode
	mutex          sync.RWMutex
	expiration     time.Duration
	userRepository *repository.UserRerpository
	messageService *MessageService
}

func NewVerificationService(userRepository *repository.UserRerpository, messageService *MessageService, cfg *config.Config) *VerificationService {
	vs := &VerificationService{
		codes:          make(map[string]*VerificationCode),
		expiration:     time.Duration(cfg.VERIFICATION_CODE_EXPIRES_IN) * time.Minute, // 驗證碼有效期
		userRepository: userRepository,
		messageService: messageService,
	}
	go vs.cleanupExpiredCodes()
	return vs
}

// GenerateCode 生成驗證碼
func (vs *VerificationService) GenerateCode(data models.CodeData) string {
	// 生成隨機驗證碼
	const (
		englishChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ" // 大寫英文
		// 簡單選取部分常用中文字符（可根據需求擴展）
		numberChars = "1234567890"
	)

	// 合併字符集
	availableChars := englishChars + numberChars

	// 生成 6 位驗證碼
	var code string
	for i := 0; i < 6; i++ {
		code += string(availableChars[rand.Intn(len(availableChars))])
	}

	// 創建驗證碼記錄
	vc := &VerificationCode{
		Code:      code,
		Data:      data,
		ExpiresAt: time.Now().Add(vs.expiration),
	}

	// 存儲驗證碼
	vs.mutex.Lock()
	vs.codes[code] = vc
	vs.mutex.Unlock()

	return code
}

func (vs *VerificationService) VerifyCode(code, email string) (bool, *models.CodeData) {
	vs.mutex.RLock()
	vc, exists := vs.codes[code]
	vs.mutex.RUnlock()

	if !exists {
		return false, nil
	}

	// 檢查是否過期
	if time.Now().After(vc.ExpiresAt) {
		vs.deleteCode(code)
		return false, nil
	}

	if vc.Data.Email != email {
		// 驗證碼與郵件不匹配
		return false, nil
	}

	// 驗證成功，刪除驗證碼
	vs.mutex.Lock()
	delete(vs.codes, code)
	vs.mutex.Unlock()
	return true, &vc.Data
}

func (vs *VerificationService) deleteCode(code string) {
	vs.mutex.Lock()
	defer vs.mutex.Unlock()

	if vc, exists := vs.codes[code]; exists {
		delete(vs.codes, code)
		if vc.Data.CodeMode == 1 {
			user, err := vs.userRepository.FindByEmail(vc.Data.Email)
			if err != nil {
				return
			}
			vs.userRepository.DeleteByID(user.ID)
			println("驗證碼模式為註冊，刪除用戶")
		}
		if vc.Data.CodeMode == 2 {
			println("驗證碼模式為家庭驗證，刪除家庭ID")
		}

	}
}

func (vs *VerificationService) cleanupExpiredCodes() {
	ticker := time.NewTicker(time.Minute)
	for range ticker.C {
		vs.mutex.RLock()
		var expiredCodes []string
		now := time.Now()

		for code, vc := range vs.codes {
			if now.After(vc.ExpiresAt) {
				expiredCodes = append(expiredCodes, code)
			}
		}
		vs.mutex.RUnlock()

		for _, code := range expiredCodes {
			vs.deleteCode(code)
		}
	}
}

func (vs *VerificationService) SendVerifyCode(data models.CodeData) error {
	code := vs.GenerateCode(data)

	vs.messageService.SendEmailMessage(data.Email, "驗證碼", "您的驗證碼是: "+code)

	return nil
}
