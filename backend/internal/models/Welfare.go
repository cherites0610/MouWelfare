package models

type Welfare struct {
	ID              uint       `json:"id" gorm:"primaryKey;autoIncrement"`
	LocationID      uint       `json:"location_id" gorm:"type:int;not null"`
	Location        Location   `json:"-" gorm:"foreignKey:LocationID;references:ID"`
	Title           string     `json:"title" gorm:"type:varchar(50);not null"`
	Details         string     `json:"details" gorm:"type:text;not null"`
	Url             string     `json:"url" gorm:"type:varchar(255);not null"`
	PublicationDate string     `json:"publication_date" gorm:"type:datetime;not null"`
	Status          bool       `json:"status" gorm:"type:tinyint(1);not null;default:1"`
	Identities      []Identity `json:"identities" gorm:"many2many:welfare_identities"`
	Categories      []Category `json:"categories" gorm:"many2many:welfare_categories"`
	CreatedAt       string     `json:"created_at" gorm:"type:datetime;not null"`
	Forward         string     `json:"forward" gorm:"type:varchar(255);not null"`
}
