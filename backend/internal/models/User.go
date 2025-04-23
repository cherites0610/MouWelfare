package models

type User struct {
	// ID              uint      `json:"id" gorm:"primaryKey"`
	// Name            *string   `json:"name"`
	// Account         string    `json:"account"`
	// Password        string    `json:"password"`
	// Email           string    `json:"email"`
	// Birthday        *string   `json:"birthday"`
	// Female          *uint     `json:"fale"`
	// Location        *Location `json:"location"`
	// LocationID      *uint
	// Identities      *[]Identity `json:"identities" gorm:"many2many:user_identities"`
	// IsVerified      bool        `json:"is_verified" gorm:"default:false"`
	// IsSubscribe     bool        `json:"is_subscribe" gorm:"default:false"`
	// Families        *[]Family   `json:"fmailies" gorm:"many2many:user_familys;"`
	// SetNickNames    *[]NickName `gorm:"foreignKey:SetterUserID"`
	// TargetNickNames *[]NickName `gorm:"foreignKey:TargetUserID"`

	ID           uint            `json:"id" gorm:"primaryKey;autoIncrement"`
	Name         *string         `json:"name" gorm:"type:varchar(10)"`
	Account      string          `json:"account" gorm:"type:varchar(20);not null;unique"`
	Password     string          `json:"password" gorm:"type:varchar(255);not null"`
	Email        string          `json:"email" gorm:"type:varchar(128);not null;unique"`
	Birthday     *string         `json:"birthday" gorm:"type:date"`
	Female       *uint           `json:"female" gorm:"type:tinyint(1);default:0"` // 0: 未設定, 1: 男, 2: 女 3: 其他
	LocationID   *uint           `json:"location_id" gorm:"type:tinyint"`
	Location     *Location       `json:"location" gorm:"foreignKey:LocationID;references:ID"`
	Identities   *[]Identity     `json:"identities" gorm:"many2many:user_identities"`
	IsVerified   bool            `json:"is_verified" gorm:"type:tinyint;not null;default:0"`
	IsSubscribe  bool            `json:"is_subscribe" gorm:"type:tinyint;not null;default:0"`
	Families     *[]Family       `json:"families" gorm:"many2many:user_families;"`
	SearchRecord *[]SearchRecord `json:"search_record" gorm:"foreignKey:UserID;references:ID"`
	LineID       *string         `json:"line_id" gorm:"type:varchar(50);unique"`
}
