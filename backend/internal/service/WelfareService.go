package service

import (
	"Mou-Welfare/internal/models"
	"Mou-Welfare/internal/repository"
	"errors"
	"fmt"

	"gorm.io/gorm"
)

type WelfareService struct {
	welfareRepo      *repository.WelfareRepo
	constantsService *ConstantsService
}

func NewWelfareService(welfareRepo *repository.WelfareRepo, constantsService *ConstantsService) *WelfareService {
	return &WelfareService{welfareRepo: welfareRepo, constantsService: constantsService}
}

func (s *WelfareService) GetWelfareAll(page, pageSize int, locations, identities, categories []string, search string) ([]models.Welfare, int64, error) {
	// 計算偏移量
	offset := (page - 1) * pageSize

	categoriesID := []uint{}
	for _, category := range categories {
		if category != "" {
			id, _ := s.constantsService.GetCategoryIDByName(category)
			categoriesID = append(categoriesID, id)
		}

	}
	locationsID := []uint{}
	for _, location := range locations {
		if location != "" {
			id, _ := s.constantsService.GetLocationIDByName(location)
			locationsID = append(locationsID, id)
		}

	}

	identitiesID := []uint{}
	for _, identity := range identities {
		if identity != "" {
			id, _ := s.constantsService.GetIdentityIDByName(identity)
			identitiesID = append(identitiesID, id)
		}

	}

	// 查詢分頁數據
	welfares, total, err := s.welfareRepo.FindWelfares(offset, pageSize, locationsID, categoriesID, search)
	if err != nil {
		return nil, 0, err
	}

	return welfares, total, nil
}

func (s *WelfareService) GetWelfareLightStatus(welfareIdentities, identities []uint) uint {
	fmt.Println(welfareIdentities)
	fmt.Println(identities)

	contains := func(arr []uint, val uint) bool {
		for _, a := range arr {
			if a == val {
				return true
			}
		}
		return false
	}

	// 規則0：檢查 identities 是否為空或首元素為 0
	if len(identities) == 0 || identities[0] == 0 {
		return 2
	}

	// 規則1：年齡段檢查 (1: <20歲, 2: 20-65歲, 3: >65歲)
	ageGroups := []uint{1, 2, 3}
	ageMatches := false
	hasAgeRequirement := false
	for _, age := range ageGroups {
		if contains(welfareIdentities, age) {
			hasAgeRequirement = true
			if contains(identities, age) {
				ageMatches = true
			}
		}
	}
	if hasAgeRequirement && !ageMatches {
		return 3
	}

	// 規則2 & 3：檢查 4 到 11 的任意值
	for i := uint(4); i <= 11; i++ {
		if contains(welfareIdentities, i) && !contains(identities, i) {
			return 3
		}
	}

	// 所有條件符合
	return 1
}

func (s *WelfareService) GetWelfareByID(id uint) (*models.Welfare, error) {
	welfare, err := s.welfareRepo.FindByID(id)
	if err != nil {
		return nil, err
	}
	return welfare, nil
}

func (s *WelfareService) AddFavorite(userID, welfareID uint) error {
	err := s.welfareRepo.AddFavorite(userID, welfareID)
	if errors.Is(err, gorm.ErrDuplicatedKey) {
		return fmt.Errorf("該福利已在我的最愛")
	}
	return s.welfareRepo.AddFavorite(userID, welfareID)
}

func (s *WelfareService) DeleteFavorite(userID, welfareID uint) error {
	return s.welfareRepo.DeleteFavorite(userID, welfareID)
}

func (s *WelfareService) FindFavoritesByUserID(userID uint) ([]models.Welfare, error) {
	return s.welfareRepo.FindFavoritesByUserID(userID)
}
