package service

import (
	"Mou-Welfare/internal/config"
	"Mou-Welfare/internal/models"
	"Mou-Welfare/internal/repository"
	"Mou-Welfare/internal/util"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/sirupsen/logrus"
	"gorm.io/gorm"
)

type UserService struct {
	UserRepo            *repository.UserRerpository
	verificationService *VerificationService
	authService         *AuthService
	messageService      *MessageService
	userVerifcation     map[uint]*UserVerifcation //二級驗證
	cfg                 *config.Config
	log                 *logrus.Logger
	mutex               sync.RWMutex
}

type UserVerifcation struct {
	user      models.User
	ExpiresAt time.Time
}

func NewUserService(userRepo *repository.UserRerpository, verificationService *VerificationService, authService *AuthService, messageService *MessageService, cfg *config.Config, log *logrus.Logger) *UserService {
	us := &UserService{
		UserRepo:            userRepo,
		verificationService: verificationService,
		userVerifcation:     make(map[uint]*UserVerifcation),
		authService:         authService,
		messageService:      messageService,
		cfg:                 cfg,
		log:                 log,
	}
	go us.cleanupExpiredUserVerifcation()
	return us
}

func (s *UserService) Register(account, password, email string) (*models.User, error) {
	// 檢查郵箱，賬號是否存在
	if _, err := s.UserRepo.FindByAccount(account); err == nil {
		return &models.User{}, fmt.Errorf("賬號已存在")
	}
	if _, err := s.UserRepo.FindByEmail(email); err == nil {
		return &models.User{}, fmt.Errorf("郵箱已被使用過")
	}

	// 密碼加密
	hashedPassword, err := util.HashPassword(password)
	if err != nil {
		return nil, fmt.Errorf("密碼加密失敗")
	}

	user := models.User{
		Account:  account,
		Password: hashedPassword,
		Email:    email,
		Name:     &account,
	}

	// 存進資料庫
	err = s.UserRepo.Create(&user)
	if err != nil {
		return &models.User{}, fmt.Errorf("用戶創建失敗")
	}

	_, err = s.SendVerifyEmailCode(user.Email)
	if err != nil {
		return nil, err
	}

	s.log.WithFields(logrus.Fields{
		"account": user.Account,
		"email":   user.Email,
	}).Info("User registered successfully")

	return &user, nil
}

func (s *UserService) UpdataPassword(email, newPassword string) error {
	user, err := s.UserRepo.FindByEmail(email)
	if err != nil {
		return fmt.Errorf("找不到用戶")
	}

	verify := s.IsVerify(user.ID)
	if !verify {
		return fmt.Errorf("尚未驗證")
	}

	// 密碼加密
	hashedPassword, err := util.HashPassword(newPassword)
	if err != nil {
		return fmt.Errorf("密碼加密失敗")
	}

	err = s.UserRepo.UpdataPassword(user.ID, hashedPassword)
	if err != nil {
		return fmt.Errorf("密碼更改失敗")
	}

	return nil
}

func (s *UserService) SendVerifyEmailCode(email string) (*string, error) {
	// 檢查郵箱是否存在
	existsUser, err := s.UserRepo.FindByEmail(email)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("郵箱不存在")
		}
		return nil, fmt.Errorf("failed to query email: %v", err)
	}

	code := s.verificationService.GenerateCode(models.CodeData{CodeMode: 1, UserID: &existsUser.ID, Email: existsUser.Email})
	fmt.Println("驗證碼:", code)
	// 發驗證碼
	err = s.messageService.SendEmailMessage(existsUser.Email, "驗證碼", fmt.Sprintf("您的驗證碼是: %s", code))
	if err != nil {
		return nil, fmt.Errorf("郵件發送失敗")
	}

	s.log.WithFields(logrus.Fields{
		"email": existsUser.Email,
	}).Info("Verification code sent successfully")

	return &code, nil
}

func (s *UserService) Login(account, password string) (*models.User, *string, error) {
	// 先檢查賬戶是否存在
	existsUser, err := s.UserRepo.FindByAccount(account)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil, fmt.Errorf("找不到賬號") // 統一錯誤訊息
		}
		return nil, nil, fmt.Errorf("failed to query account: %v", err)
	}

	// 檢查密碼是否正確
	if !util.CheckPasswordHash(password, existsUser.Password) {
		return nil, nil, fmt.Errorf("密碼錯誤")
	}

	// 若未驗證則需先驗證
	if !existsUser.IsVerified {
		return nil, nil, fmt.Errorf("該賬號還未驗證")
	}

	// 若已驗證則發 JWT token
	token, err := s.authService.GenerateToken(existsUser.ID)
	if err != nil {
		return nil, nil, fmt.Errorf("token 生成失敗")
	}

	existsUser.Password = "" // 清除密碼

	// 發送 LINE 訊息
	// err = s.messageService.SendLineMessage(fmt.Sprintf("%s,您已登入app", *existsUser.Name), *existsUser.LineID)
	// if err != nil {
	// return nil, nil, fmt.Errorf("LINE 訊息發送失敗")
	// }

	s.log.WithFields(logrus.Fields{
		"account": existsUser.Account,
	}).Info("User logged in successfully")

	return existsUser, &token, nil
}

func (s *UserService) UpdateProfile(id uint, name, birthday string, female uint, IsSubscribe bool) (*models.User, error) {
	// 檢查用戶是否存在
	existsUser, err := s.UserRepo.FindByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("user not found")
		}
		return nil, fmt.Errorf("failed to query user: %v", err)
	}

	// 更新用戶資料
	existsUser.Name = &name
	existsUser.IsSubscribe = IsSubscribe
	existsUser.Birthday = &birthday
	existsUser.Female = &female

	err = s.UserRepo.Save(existsUser)
	if err != nil {
		return nil, fmt.Errorf("failed to update user: %v", err)
	}

	return existsUser, nil
}

func (s *UserService) VerifyToken(token string) (*models.User, error) {
	// 解析 token
	user, err := s.authService.VerifyToken(token)
	if err != nil {
		return nil, fmt.Errorf("failed to verify token: %v", err)
	}

	return user, nil
}

// 插入二級驗證
func (s *UserService) Verify(email string) error {
	user, err := s.UserRepo.FindByEmail(email)
	if err != nil {
		return err
	}

	uv := &UserVerifcation{
		user:      *user,
		ExpiresAt: time.Now().Add(5 * time.Minute),
	}

	s.mutex.Lock()
	s.userVerifcation[user.ID] = uv
	s.mutex.Unlock()
	fmt.Println("已經插入二級驗證", user.ID)
	return nil
}

// 檢查二級驗證
func (s *UserService) IsVerify(userID uint) bool {
	_, exists := s.userVerifcation[userID]
	if !exists {
		return false
	}

	s.mutex.Lock()
	delete(s.userVerifcation, userID)
	s.mutex.Unlock()

	return true
}

// 定期清理過期的二級驗證
func (s *UserService) cleanupExpiredUserVerifcation() {
	ticker := time.NewTicker(time.Minute)
	for range ticker.C {
		s.mutex.RLock()
		var expiredUser []uint
		now := time.Now()

		for userId, vc := range s.userVerifcation {
			if now.After(vc.ExpiresAt) {
				expiredUser = append(expiredUser, userId)
			}
		}
		s.mutex.RUnlock()

		for _, userID := range expiredUser {
			fmt.Println("已經移除二級驗證", userID)
			delete(s.userVerifcation, userID)
		}
	}
}

type TokenResponse struct {
	AccessToken      string `json:"access_token"`
	ExpiresIn        int    `json:"expires_in"`
	RefreshToken     string `json:"refresh_token"`
	Scope            string `json:"scope"`
	TokenType        string `json:"token_type"`
	Error            string `json:"error,omitempty"`
	ErrorDescription string `json:"error_description,omitempty"`
}

func (s *UserService) GetLineProfileByAccessToken(accessToken string) (string, error) {
	// 創建 HTTP 客戶端
	httpClient := &http.Client{}

	// 創建 GET 請求
	req, err := http.NewRequest("GET", s.cfg.LINE_USER_PROFILE_APIURL, nil)
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}

	// 設置請求頭
	req.Header.Set("Authorization", "Bearer "+accessToken)

	// 發送請求
	resp, err := httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	// 檢查 HTTP 狀態碼
	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("unexpected status code: %d, body: %s", resp.StatusCode, string(bodyBytes))
	}

	// 解析回應
	var profileResp struct {
		UserID string `json:"userId"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&profileResp); err != nil {
		return "", fmt.Errorf("failed to decode response: %w", err)
	}

	return profileResp.UserID, nil
}

func (s *UserService) GetLineAccessTokenByAuthCode(authCode string) (string, error) {
	// 構建 POST 請求的表單數據
	data := url.Values{}
	data.Set("grant_type", "authorization_code")
	data.Set("code", authCode)
	data.Set("client_id", s.cfg.LINE_CLIENT_ID)
	data.Set("client_secret", s.cfg.LINE_CHANNEL_SECRET)
	data.Set("redirect_uri", fmt.Sprintf("%s/api/LineLoginCallback", s.cfg.DOMAIN))

	// 創建 HTTP 客戶端
	httpClient := &http.Client{}

	// 創建 POST 請求
	req, err := http.NewRequest("POST", s.cfg.LINE_TOKEN_APIURL, strings.NewReader(data.Encode()))
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}

	// 設置請求頭
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	// 發送請求
	resp, err := httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	// 檢查 HTTP 狀態碼
	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("unexpected status code: %d, body: %s", resp.StatusCode, string(bodyBytes))
	}

	// 解析回應
	var tokenResp TokenResponse
	if err := json.NewDecoder(resp.Body).Decode(&tokenResp); err != nil {
		return "", fmt.Errorf("failed to decode response: %w", err)
	}

	// 檢查是否有錯誤訊息
	if tokenResp.Error != "" {
		return "", fmt.Errorf("LINE API error: %s, description: %s", tokenResp.Error, tokenResp.ErrorDescription)
	}

	// 確保 Access Token 存在
	if tokenResp.AccessToken == "" {
		return "", fmt.Errorf("no access token returned")
	}

	return tokenResp.AccessToken, nil
}
