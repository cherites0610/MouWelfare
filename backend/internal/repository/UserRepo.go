package repository

import (
	"Mou-Welfare/internal/models"

	"gorm.io/gorm"
)

type UserRerpository struct {
	db *gorm.DB
}

func NewUserRepository(db *gorm.DB) *UserRerpository {
	return &UserRerpository{db}
}

func (r *UserRerpository) Create(user *models.User) error {
	return r.db.Create(user).Error
}

func (r *UserRerpository) Save(user *models.User) error {
	return r.db.Save(user).Error
}

func (r *UserRerpository) FindByEmail(email string) (*models.User, error) {
	var user models.User
	err := r.db.Where("email = ?", email).Preload("Identities").First(&user).Error
	return &user, err
}

func (r *UserRerpository) FindByAccount(account string) (*models.User, error) {
	var user models.User
	err := r.db.Where("account = ?", account).Preload("Identities").First(&user).Error
	return &user, err
}

func (c *UserRerpository) FindByID(id uint) (*models.User, error) {
	var user models.User
	err := c.db.Where("id = ?", id).Preload("Identities").First(&user).Error
	return &user, err
}

func (c *UserRerpository) DeleteByID(id uint) error {
	return c.db.Delete(&models.User{}, id).Error
}
