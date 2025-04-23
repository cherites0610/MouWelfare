package models

type Identity struct {
	// ID   uint   `json:"identity_id" gorm:"primaryKey"`
	// Name string `json:"identity_name"`

	ID   uint   `json:"id" gorm:"primaryKey;autoIncrement"`
	Name string `json:"name" gorm:"type:varchar(15);not null;unique"`
}
