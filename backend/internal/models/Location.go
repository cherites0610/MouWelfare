package models

type Location struct {
	// ID   uint   `json:"location_id" gorm:"primaryKey"`
	// Name string `json:"location_name"`

	ID   uint   `json:"id" gorm:"primaryKey;autoIncrement"`
	Name string `json:"name" gorm:"type:varchar(10);not null;unique"`
}
