package models

type UserFavorite struct {
	UserID    uint `json:"user_id" gorm:"primaryKey;autoIncrement:false"`
	WelfareID uint `json:"welfare_id" gorm:"primaryKey;autoIncrement:false"`
}
