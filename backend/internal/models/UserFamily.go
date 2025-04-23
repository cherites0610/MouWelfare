package models

type UserFamily struct {
	// UserID   uint `json:"user_id" gorm:"primaryKey"`
	// FamilyID uint `json:"family_id" gorm:"primaryKey"`
	// Role     uint `json:"role"`

	UserID   uint `json:"user_id" gorm:"primaryKey;autoIncrement:false"`
	FamilyID uint `json:"family_id" gorm:"primaryKey;autoIncrement:false"`
	Role     uint `json:"role" gorm:"type:tinyint;not null;default:3"` // 1: 創建者, 2: 管理者, 3: 成員
}
