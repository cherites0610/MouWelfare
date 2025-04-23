package service

import (
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

	"gorm.io/gorm"
)

type UserService struct {
	UserRepo            *repository.UserRerpository
	verificationService *VerificationService
	authService         *AuthService
}

func NewUserService(userRepo *repository.UserRerpository, verificationService *VerificationService, authService *AuthService) *UserService {
	return &UserService{UserRepo: userRepo, verificationService: verificationService, authService: authService}
}

func (s *UserService) Register(account, password, email string) (*models.User, error) {
	// 檢查郵箱，賬號是否存在
	// if _, err := s.UserRepo.FindByAccount(account); err == nil {
	// 	return &models.User{}, fmt.Errorf("account %s already exists", account)
	// }
	// if _, err := s.UserRepo.FindByEmail(email); err == nil {
	// 	return &models.User{}, fmt.Errorf("email %s already exists", email)
	// }

	// 密碼加密
	hashedPassword, err := util.HashPassword(password)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password: %v", err)
	}

	user := models.User{
		Account:  account,
		Password: hashedPassword,
		Email:    email,
	}

	// 存進資料庫
	err = s.UserRepo.Create(&user)
	if err != nil {
		return &models.User{}, err
	}

	// 發驗證短信
	err = s.verificationService.SendVerifyCode(models.CodeData{CodeMode: 1, UserID: &user.ID, Email: user.Email})
	if err != nil {
		return &models.User{}, err
	}

	return &user, nil
}

func (s *UserService) Login(account, password string) (*models.User, *string, error) {
	// 先檢查賬戶是否存在
	existsUser, err := s.UserRepo.FindByAccount(account)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil, fmt.Errorf("invalid account or password") // 統一錯誤訊息
		}
		return nil, nil, fmt.Errorf("failed to query account: %v", err)
	}

	// 檢查密碼是否正確
	if !util.CheckPasswordHash(password, existsUser.Password) {
		return nil, nil, fmt.Errorf("invalid account or password")
	}

	// 若未驗證則需先驗證
	if !existsUser.IsVerified {
		return nil, nil, fmt.Errorf("account not verified")
	}

	// 若已驗證則發 JWT token
	token, err := s.authService.GenerateToken(existsUser.ID)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to generate token: %v", err)
	}

	existsUser.Password = "" // 清除密碼

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

type TokenResponse struct {
	AccessToken      string `json:"access_token"`
	ExpiresIn        int    `json:"expires_in"`
	RefreshToken     string `json:"refresh_token"`
	Scope            string `json:"scope"`
	TokenType        string `json:"token_type"`
	Error            string `json:"error,omitempty"`
	ErrorDescription string `json:"error_description,omitempty"`
}

func (s UserService) GetLineProfileByAccessToken(accessToken string) (string, error) {
	// 創建 HTTP 客戶端
	httpClient := &http.Client{}

	// 創建 GET 請求
	req, err := http.NewRequest("GET", "https://api.line.me/v2/profile", nil)
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

func (s UserService) GetLineAccessTokenByAuthCode(authCode string) (string, error) {
	// 構建 POST 請求的表單數據
	data := url.Values{}
	data.Set("grant_type", "authorization_code")
	data.Set("code", authCode)
	data.Set("client_id", "2007306117")
	data.Set("client_secret", "7e5406e1b1d55ebc089f59849b49b0d4")
	data.Set("redirect_uri", "https://9845-118-169-236-110.ngrok-free.app/api/LineLoginCallback")

	// 創建 HTTP 客戶端
	httpClient := &http.Client{}

	// 創建 POST 請求
	req, err := http.NewRequest("POST", "https://api.line.me/oauth2/v2.1/token", strings.NewReader(data.Encode()))
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
