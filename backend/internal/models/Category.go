package models

type Category struct {
	// ID   uint   `json:"id" gorm:"primaryKey;autoIncrement"`
	// Name string `json:"name" gorm:"type:varchar(10);not null"`

	ID   uint   `json:"id" gorm:"primaryKey;autoIncrement"`
	Name string `json:"name" gorm:"type:varchar(15);not null;unique"`
}
