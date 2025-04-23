package models

type SearchRecord struct {
	ID     uint   `json:"id" gorm:"primaryKey;autoIncrement"`
	UserID uint   `json:"user_id" gorm:"type:int;not null"`
	Record string `json:"keyword" gorm:"type:varchar(50);not null"`
}
