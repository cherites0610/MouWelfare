package service

import (
	"Mou-Welfare/internal/models"
	"Mou-Welfare/internal/repository"
	constants "Mou-Welfare/pkg/constans"
	"fmt"
	"math/rand"
)

type WelfareService struct {
	welfareRepo *repository.WelfareRepo
}

func NewWelfareService(welfareRepo *repository.WelfareRepo) *WelfareService {
	return &WelfareService{welfareRepo: welfareRepo}
}

func (s *WelfareService) GetWelfareAll(page, pageSize int, locations, identities, categories []string, search string) ([]models.Welfare, int64, error) {
	// 計算偏移量
	offset := (page - 1) * pageSize

	categoriesID := []uint{}
	for _, category := range categories {
		if category != "" {
			categoriesID = append(categoriesID, constants.StringToCategory(category))
		}

	}
	locationsID := []uint{}
	for _, location := range locations {
		if location != "" {
			locationsID = append(locationsID, constants.StringToLocation(location))
		}

	}

	identitiesID := []uint{}
	for _, identity := range identities {
		if identity != "" {
			identitiesID = append(identitiesID, constants.StringToIdentity((identity)))
		}

	}

	fmt.Println(identitiesID)

	// 查詢分頁數據
	welfares, total, err := s.welfareRepo.FindWelfares(offset, pageSize, locationsID, categoriesID, search)
	if err != nil {
		return nil, 0, err
	}

	return welfares, total, nil
}

func (s *WelfareService) GetWelfareLightStatus(welfareID uint, identities []uint) (LightStatus uint) {
	return uint(rand.Intn(3)) // 隨機生成
}

func (s *WelfareService) GetWelfareByID(id uint) (*models.Welfare, error) {
	welfare, err := s.welfareRepo.FindByID(id)
	if err != nil {
		return nil, err
	}
	return welfare, nil
}

func (s *WelfareService) AddFavorite(userID, welfareID uint) error {
	return s.welfareRepo.AddFavorite(userID, welfareID)
}

func (s *WelfareService) DeleteFavorite(userID, welfareID uint) error {
	return s.welfareRepo.DeleteFavorite(userID, welfareID)
}

func (s *WelfareService) FindFavoritesByUserID(userID uint) ([]models.Welfare, error) {
	return s.welfareRepo.FindFavoritesByUserID(userID)
}
