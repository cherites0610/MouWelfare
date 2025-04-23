package models

type NickName struct {
	// SetterUserID uint   `json:"setter_user_id" gorm:"primaryKey"`
	// TargetUserID uint   `json:"target_user_id" gorm:"primaryKey"`
	// FamilyID     uint   `json:"fmaily_id" gorm:"primaryKey"`
	// NickName     string `json:"nick_name" gorm:"not null"`
	// SetterUser   User   `gorm:"foreignKey:SetterUserID;references:ID"`
	// TargetUser   User   `gorm:"foreignKey:TargetUserID;references:ID"`
	// Family       Family `gorm:"foreignKey:FamilyID;references:ID"`

	SetterUserID uint   `json:"setter_user_id" gorm:"primaryKey;autoIncrement:false"`
	TargetUserID uint   `json:"target_user_id" gorm:"primaryKey;autoIncrement:false"`
	FamilyID     uint   `json:"family_id" gorm:"primaryKey;autoIncrement:false"`
	NickName     string `json:"nick_name" gorm:"type:varchar(10);not null"`
	SetterUser   User   `gorm:"foreignKey:SetterUserID;references:ID"`
	TargetUser   User   `gorm:"foreignKey:TargetUserID;references:ID"`
	Family       Family `gorm:"foreignKey:FamilyID;references:ID"`
}
