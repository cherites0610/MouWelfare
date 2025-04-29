package models

type Family struct {
	// ID        uint         `json:"family_id" gorm:"primaryKey"`
	// Name      string       `json:"family_name"`
	// Members   []UserFamily `gorm:"foreignKey:FamilyID"`
	// NickNames []NickName   `gorm:"foreignKey:FamilyID"`

	ID        uint         `json:"id" gorm:"primaryKey;autoIncrement"`
	Name      string       `json:"name" gorm:"type:varchar(10);not null"`
	Members   []UserFamily `gorm:"foreignKey:FamilyID;references:ID"`
	NickNames []NickName   `gorm:"foreignKey:FamilyID;references:ID"`
}
