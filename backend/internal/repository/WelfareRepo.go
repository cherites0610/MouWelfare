package repository

import (
	"Mou-Welfare/internal/models"

	"gorm.io/gorm"
)

type WelfareRepo struct {
	db *gorm.DB
}

func NewWelfareRepo(db *gorm.DB) *WelfareRepo {
	return &WelfareRepo{db}
}

func (r *WelfareRepo) FindByID(id uint) (*models.Welfare, error) {
	var welfare models.Welfare
	err := r.db.Preload("Identities").Preload("Categories").Preload("Location").Where("id = ?", id).First(&welfare).Error
	return &welfare, err
}

func (r *WelfareRepo) FindAll() ([]models.Welfare, error) {
	var welfares []models.Welfare
	err := r.db.Preload("Identities").Preload("Categories").Preload("Location").Find(&welfares).Error
	return welfares, err
}
