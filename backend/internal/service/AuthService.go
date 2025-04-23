package service

import (
	"Mou-Welfare/internal/models"
	"Mou-Welfare/internal/repository"
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"gorm.io/gorm"
)

type AuthService struct {
	repo        *repository.UserRerpository
	secretKey   []byte        // JWT 簽名用的秘密鑰匙
	tokenExpiry time.Duration // token 有效期
}

func NewAuthService(userRepo *repository.UserRerpository) *AuthService {
	return &AuthService{
		repo:        userRepo,
		secretKey:   []byte("your-secret-key"), // 應從環境變量加載
		tokenExpiry: 72 * time.Hour,
	}
}

func (s *AuthService) GenerateToken(userID uint) (string, error) {
	// 創建 JWT claims
	claims := jwt.MapClaims{
		"user_id": userID,
		"exp":     time.Now().Add(s.tokenExpiry).Unix(), // 過期時間
		"iat":     time.Now().Unix(),                    // 發行時間
	}

	// 創建 token
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	// 簽名 token
	tokenString, err := token.SignedString(s.secretKey)
	if err != nil {
		return "", fmt.Errorf("failed to sign token: %w", err)
	}

	return tokenString, nil
}

func (s *AuthService) VerifyToken(tokenString string) (*models.User, error) {
	// 解析 token
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		// 驗證簽名方法
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Method.Alg())
		}
		return s.secretKey, nil
	})
	if err != nil {
		return nil, fmt.Errorf("failed to parse token: %w", err)
	}

	// 檢查 token 是否有效
	if !token.Valid {
		return nil, errors.New("invalid token")
	}

	// 提取 claims
	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return nil, errors.New("invalid token claims")
	}

	// 提取 user_id
	userIDFloat, ok := claims["user_id"].(float64) // JWT 將數字解析為 float64
	if !ok {
		return nil, errors.New("invalid user_id in token")
	}
	userID := uint(userIDFloat)

	// 查詢用戶
	user, err := s.repo.FindByID(userID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("user not found")
		}
		return nil, fmt.Errorf("failed to query user: %w", err)
	}

	return user, nil
}
