package service

import (
	"Mou-Welfare/internal/repository"
	"errors"
	"log"
	"strings"
	"sync"
)

// ConstantsService 常量業務邏輯
type ConstantsService struct {
	repo      *repository.ConstantsRerpository
	constants repository.Constants
	mu        sync.RWMutex
}

// NewConstantsService 創建 ConstantsService 實例
func NewConstantsService(repo *repository.ConstantsRerpository) *ConstantsService {
	svc := &ConstantsService{repo: repo}
	// 初次加載常量
	if err := svc.RefreshConstants(); err != nil {
		log.Fatalf("Initial constants load failed: %v", err)
	}
	return svc
}

// GetConstants 獲取常量數據
func (s *ConstantsService) GetConstants() repository.Constants {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.constants
}

// RefreshConstants 刷新常量數據
func (s *ConstantsService) RefreshConstants() error {
	constants, err := s.repo.LoadConstants()
	if err != nil {
		log.Printf("Failed to refresh constants: %v", err)
		return err
	}

	s.mu.Lock()
	s.constants = constants
	s.mu.Unlock()

	log.Println("Constants refreshed successfully")
	return nil
}

// GetLocationNameByID 根據 Location ID 獲取 Name
func (s *ConstantsService) GetLocationNameByID(id uint) (string, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	for _, loc := range s.constants.Locations {
		if loc.ID == id {
			return loc.Name, nil
		}
	}
	return "", errors.New("location not found")
}

// GetLocationIDByName 根據 Location Name 獲取 ID
func (s *ConstantsService) GetLocationIDByName(name string) (uint, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	name = strings.TrimSpace(name)
	for _, loc := range s.constants.Locations {
		if strings.EqualFold(loc.Name, name) {
			return loc.ID, nil
		}
	}
	return 0, errors.New("location not found")
}

// GetCategoryNameByID 根據 Category ID 獲取 Name
func (s *ConstantsService) GetCategoryNameByID(id uint) (string, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	for _, cat := range s.constants.Categories {
		if cat.ID == id {
			return cat.Name, nil
		}
	}
	return "", errors.New("category not found")
}

// GetCategoryIDByName 根據 Category Name 獲取 ID
func (s *ConstantsService) GetCategoryIDByName(name string) (uint, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	name = strings.TrimSpace(name)
	for _, cat := range s.constants.Categories {
		if strings.EqualFold(cat.Name, name) {
			return cat.ID, nil
		}
	}
	return 0, errors.New("category not found")
}

// GetIdentityNameByID 根據 Identity ID 獲取 Name
func (s *ConstantsService) GetIdentityNameByID(id uint) (string, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	for _, iden := range s.constants.Identities {
		if iden.ID == id {
			return iden.Name, nil
		}
	}
	return "", errors.New("identity not found")
}

// GetIdentityIDByName 根據 Identity Name 獲取 ID
func (s *ConstantsService) GetIdentityIDByName(name string) (uint, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	name = strings.TrimSpace(name)
	for _, iden := range s.constants.Identities {
		if strings.EqualFold(iden.Name, name) {
			return iden.ID, nil
		}
	}
	return 0, errors.New("identity not found")
}
