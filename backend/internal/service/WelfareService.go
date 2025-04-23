package service

import (
	"Mou-Welfare/internal/models"
	"Mou-Welfare/internal/repository"
)

type WelfareService struct {
	welfareRepo *repository.WelfareRepo
}

func NewWelfareService(welfareRepo *repository.WelfareRepo) *WelfareService {
	return &WelfareService{welfareRepo: welfareRepo}
}

func (s *WelfareService) GetWelfareAll() ([]models.Welfare, error) {
	welfares, err := s.welfareRepo.FindAll()
	if err != nil {
		return nil, err
	}
	return welfares, nil
}

func (s *WelfareService) GetWelfareByID(id uint) (*models.Welfare, error) {
	welfare, err := s.welfareRepo.FindByID(id)
	if err != nil {
		return nil, err
	}
	return welfare, nil
}
