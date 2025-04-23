package util

import (
	"golang.org/x/crypto/bcrypt"
)

// HashPassword 將明文密碼加密為哈希值
// password: 明文密碼
// 返回值: 加密後的哈希字符串和可能的錯誤
func HashPassword(password string) (string, error) {
	// 將密碼轉為字節切片並生成哈希
	// bcrypt.DefaultCost 是默認的計算成本（10），可以根據需求調整（越高越安全，但越慢）
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	return string(bytes), nil
}

// CheckPasswordHash 驗證密碼是否與哈希值匹配
// password: 明文密碼
// hash: 存儲的哈希值
// 返回值: 是否匹配（true 表示匹配）
func CheckPasswordHash(password, hash string) bool {
	// 比較明文密碼與哈希值
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}
