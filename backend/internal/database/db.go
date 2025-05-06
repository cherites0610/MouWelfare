package database

import (
	"Mou-Welfare/internal/config"
	"Mou-Welfare/internal/models"
	"fmt"

	"github.com/sirupsen/logrus"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

var db *gorm.DB

func SetupDatabase(cfg config.Config, log *logrus.Logger) (*gorm.DB, error) {
	user := cfg.DBUser
	password := cfg.DBPassword
	url := cfg.DBUrl
	dbname := cfg.DB_DBNAME

	dsn := fmt.Sprintf("%s:%s@tcp(%s)/%s?charset=utf8mb4&parseTime=True&loc=Local", user, password, url, dbname)
	DB, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
	db = DB
	if err != nil {
		return nil, err
	}
	log.Info("連接到數據庫")

	db.SetupJoinTable(&models.User{}, "Families", &models.UserFamily{})
	db.SetupJoinTable(&models.User{}, "Welfares", &models.UserFavorite{})
	if err := db.AutoMigrate(&models.Identity{}, &models.Category{}, &models.Location{}, &models.Family{}, &models.SearchRecord{}, &models.User{}, &models.NickName{}, &models.Welfare{}); err != nil {
		log.Fatalf("AutoMigrate failed: %s", err)
		return nil, err
	}

	log.Info("遷移成功")
	return db, nil
}
