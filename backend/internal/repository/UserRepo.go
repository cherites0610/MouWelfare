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

func (r *UserRerpository) UpdataProfile(user *models.User) error {
	// 明確更新欄位，包括 location_id
	err := r.db.Model(user).Updates(map[string]interface{}{
		"name":         user.Name,
		"birthday":     user.Birthday,
		"female":       user.Female,
		"is_subscribe": user.IsSubscribe,
		"location_id":  user.LocationID,
	}).Error
	if err != nil {
		return err
	}

	// 更新 Identities 關聯
	if user.Identities != nil {
		err = r.db.Model(user).Association("Identities").Replace(user.Identities)
		if err != nil {
			return err
		}
	}

	return nil
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

func (c *UserRerpository) UpdataPassword(id uint, password string) error {
	return c.db.Select("Password").Save(&models.User{ID: id, Password: password}).Error
}
