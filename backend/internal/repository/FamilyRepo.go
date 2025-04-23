package repository

import (
	"Mou-Welfare/internal/models"

	"gorm.io/gorm"
)

type FamilyRerpository struct {
	db *gorm.DB
}

func NewFamilyRerpository(db *gorm.DB) *FamilyRerpository {
	return &FamilyRerpository{db: db}
}

func (r *FamilyRerpository) CreateFamily(family *models.Family) error {
	err := r.db.Create(&family).Error
	if err != nil {
		return err
	}
	return nil
}

func (r *FamilyRerpository) UpdateFamily(family *models.Family) error {
	err := r.db.Save(&family).Error
	if err != nil {
		return err
	}
	return nil
}

func (r *FamilyRerpository) CreateFamilyMember(familyMember *models.UserFamily) error {
	err := r.db.Create(&familyMember).Error
	if err != nil {
		return err
	}
	return nil
}

func (r *FamilyRerpository) DeleteFamily(id uint) error {
	err := r.db.Delete(&models.Family{ID: id}).Error
	if err != nil {
		return err
	}
	return nil
}

func (r *FamilyRerpository) FindByID(id uint) (*models.Family, error) {
	var family models.Family
	err := r.db.Where("id = ?", id).Preload("Members").First(&family).Error
	if err != nil {
		return nil, err
	}
	return &family, nil
}

func (r *FamilyRerpository) FindMembersByFamilyID(familyID uint) ([]models.UserFamily, error) {
	var members []models.UserFamily
	err := r.db.Where("family_id = ?", familyID).Find(&members).Error
	if err != nil {
		return nil, err
	}
	return members, nil
}

func (r *FamilyRerpository) FindMembersByUserID(userID uint) ([]models.UserFamily, error) {
	var members []models.UserFamily
	err := r.db.Where("user_id = ?", userID).Find(&members).Error
	if err != nil {
		return nil, err
	}
	return members, nil
}

func (r *FamilyRerpository) HasUser(userID, familyID uint) bool {
	var count int64
	err := r.db.Model(&models.UserFamily{}).Where("user_id = ? AND family_id = ?", userID, familyID).Count(&count).Error
	if err != nil {
		return false
	}
	return count > 0
}

func (r *FamilyRerpository) GetMemberRole(userID, familyID uint) (uint, error) {
	var member models.UserFamily
	err := r.db.Where("user_id = ? AND family_id = ?", userID, familyID).First(&member).Error
	if err != nil {
		return 0, err
	}
	return member.Role, nil
}

func (r *FamilyRerpository) DeleteFamilyMember(userID, familyID uint) error {
	err := r.db.Where("user_id = ? AND family_id = ?", userID, familyID).Delete(&models.UserFamily{}).Error
	if err != nil {
		return err
	}
	return nil
}

func (r *FamilyRerpository) UpdateFamilyMemberRole(member *models.UserFamily) error {
	err := r.db.Save(&member).Error
	if err != nil {
		return err
	}
	return nil
}
