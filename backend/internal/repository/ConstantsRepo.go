package repository

import (
	"Mou-Welfare/internal/models"

	"gorm.io/gorm"
)

type Constants struct {
	Locations  []models.Location
	Categories []models.Category
	Identities []models.Identity
}

type ConstantsRerpository struct {
	db *gorm.DB
}

func NewConstantsReprostiory(db *gorm.DB) *ConstantsRerpository {
	return &ConstantsRerpository{db: db}
}

func (r *ConstantsRerpository) LoadConstants() (Constants, error) {
	var locations []models.Location
	r.db.Find(&locations)

	var categories []models.Category
	r.db.Find(&categories)

	var identities []models.Identity
	r.db.Find(&identities)

	constants := Constants{
		Locations:  locations,
		Identities: identities,
		Categories: categories,
	}
	return constants, nil
}
