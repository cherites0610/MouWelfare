package repository

import (
	"Mou-Welfare/internal/models"
	"fmt"

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

func (r *WelfareRepo) FindWelfares(offset, limit int, locations, categories []uint, search string) ([]models.Welfare, int64, error) {
	var welfares []models.Welfare
	var totalCount int64

	// 構建基礎查詢
	query := r.db.
		Preload("Identities").
		Preload("Categories").
		Preload("Location").
		Joins("JOIN welfare_categories ON welfare_categories.welfare_id = welfares.id")

	// 動態添加 WHERE 條件
	if len(categories) > 0 {
		query = query.Where("welfare_categories.category_id IN ?", categories)
	}
	if len(locations) > 0 {
		query = query.Where("location_id IN ?", locations)
	}
	if search != "" {
		query = query.Where("title LIKE ?", "%"+search+"%")
	}

	// 計算總數量
	err := query.Model(&models.Welfare{}).Count(&totalCount).Error
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count welfares: %w", err)
	}

	// 執行分頁查詢
	err = query.Offset(offset).Limit(limit).Find(&welfares).Error
	if err != nil {
		return nil, 0, fmt.Errorf("failed to query welfares: %w", err)
	}

	return welfares, totalCount, nil
}

func (r *WelfareRepo) FindAll() ([]models.Welfare, error) {
	var welfares []models.Welfare
	err := r.db.Find(&welfares).Error
	return welfares, err
}

func (r *WelfareRepo) AddFavorite(UserID, WelfareID uint) error {
	return r.db.Create(&models.UserFavorite{UserID: UserID, WelfareID: WelfareID}).Error
}

func (r *WelfareRepo) DeleteFavorite(UserID, WelfareID uint) error {
	return r.db.Delete(&models.UserFavorite{UserID: UserID, WelfareID: WelfareID}).Error
}

func (r *WelfareRepo) FindFavoritesByUserID(userID uint) ([]models.Welfare, error) {
	var user models.User
	// 查詢用戶並預載 Favorites 關聯
	err := r.db.Where("id = ?", userID).Preload("Favorites").First(&user).Error
	if err != nil {
		return nil, err
	}
	// 確保 Favorites 不為 nil
	if user.Favorites == nil {
		return []models.Welfare{}, nil
	}
	return *user.Favorites, nil
}
