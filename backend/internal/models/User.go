package models

type User struct {
	ID           uint            `json:"id" gorm:"primaryKey;autoIncrement"`
	Name         *string         `json:"name" gorm:"type:varchar(20)"`
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
	AvatarURL    *string         `json:"avatar_url" gorm:"type:varchar(255)"`
	Favorites    *[]Welfare      `json:"favorite" gorm:"many2many:user_favorites;"`
}
