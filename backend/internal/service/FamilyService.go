package service

import (
	"Mou-Welfare/internal/models"
	"Mou-Welfare/internal/repository"
	"fmt"

	"github.com/sirupsen/logrus"
)

type FamilyService struct {
	familyRepo *repository.FamilyRerpository
	log        *logrus.Logger
}

func NewFamilyService(familyRepo *repository.FamilyRerpository, log *logrus.Logger) *FamilyService {
	return &FamilyService{familyRepo: familyRepo, log: log}
}

func (s *FamilyService) HasUser(userID, familyID uint) bool {
	// 檢查用戶是否已經加入家庭
	familyMembers, err := s.familyRepo.FindMembersByFamilyID(familyID)
	if err != nil {
		return false
	}

	for _, member := range familyMembers {
		if member.UserID == userID {
			return true // 返回用戶已經加入家庭
		}
	}

	return false // 返回用戶未加入家庭
}

func (s *FamilyService) CreateFamily(name string, createUserID uint) (*models.Family, error) {
	// 創建新的家庭
	family := &models.Family{Name: name}
	err := s.familyRepo.CreateFamily(family)
	if err != nil {
		return nil, err // 返回 nil 或處理錯誤
	}

	err = s.JoinFamily(createUserID, family.ID, 1) // 1 代表創建者角色
	if err != nil {
		// 處理錯誤，例如加入家庭失敗
		return nil, err
	}

	logrus.Infof("用戶 %d 創建了家庭 %s", createUserID, family.Name)

	return family, nil // 返回新創建的家庭
}

func (s *FamilyService) JoinFamily(userID, familyId, role uint) error {
	// 檢查家庭是否存在
	family, err := s.familyRepo.FindByID(familyId)
	if err != nil {
		// 處理錯誤，例如家庭不存在
		return err
	}

	// 檢查用戶是否已經加入家庭
	if s.HasUser(userID, familyId) {
		// 處理錯誤，例如用戶已經在家庭中
		return fmt.Errorf("用戶已經在家庭中")
	}

	// 創建家庭成員關係
	familyMember := &models.UserFamily{
		UserID:   userID,
		FamilyID: family.ID,
		Role:     role,
	}
	err = s.familyRepo.CreateFamilyMember(familyMember)
	if err != nil {
		// 處理錯誤，例如創建失敗
		return err
	}

	logrus.Infof("用戶 %d 加入了家庭 %s", userID, family.Name)

	return nil
}

func (s *FamilyService) ExitFamily(userID, familyID uint) error {
	// 檢查用戶是否在家庭中
	role, err := s.familyRepo.GetMemberRole(userID, familyID)
	if err != nil {
		// 處理錯誤，例如無法獲取用戶角色
		return err
	}

	if role == 1 {
		// 處理錯誤，例如用戶是創建者，不能退出家庭
		return fmt.Errorf("創建者不能退出家庭")
	}

	// 刪除家庭成員關係
	err = s.familyRepo.DeleteFamilyMember(userID, familyID)
	if err != nil {
		// 處理錯誤，例如刪除失敗
		return err
	}

	logrus.Infof("用戶 %d 離開了家庭 %d", userID, familyID)

	return nil
}

func (s *FamilyService) GetFamily(id uint) (*models.Family, error) {
	// 檢查家庭是否存在
	family, err := s.familyRepo.FindByID(id)
	if err != nil {
		// 處理錯誤，例如家庭不存在
		return nil, err
	}

	// 返回家庭信息
	return family, nil
}

func (s *FamilyService) UpdateFamilyName(familyID, userID uint, name string) error {
	// 檢查用戶是否在家庭中
	role, err := s.familyRepo.GetMemberRole(userID, familyID)
	if err != nil {
		// 處理錯誤，例如無法獲取用戶角色
		return err
	}

	if role != 1 && role != 2 {
		// 處理錯誤，例如用戶不是創建者or管理者，不能更新家庭名稱
		return fmt.Errorf("用戶沒有更新家庭名稱的權限")
	}

	family := &models.Family{
		ID:   familyID,
		Name: name,
	}
	err = s.familyRepo.UpdateFamily(family)
	if err != nil {
		// 處理錯誤，例如更新失敗
		return err
	}

	logrus.Infof("用戶 %d 更新了家庭 %d 的名稱為 %s", userID, familyID, name)

	return nil
}

func (s *FamilyService) DeleteFamily(id uint, deleteUserID uint) error {
	// 還需要檢查權限
	role, err := s.familyRepo.GetMemberRole(deleteUserID, id)
	if err != nil {
		// 處理錯誤，例如無法獲取用戶角色
		return err
	}

	if role != 1 {
		// 處理錯誤，例如用戶不是創建者
		return fmt.Errorf("用戶沒有刪除家庭的權限")
	}

	err = s.familyRepo.DeleteFamily(id)
	if err != nil {
		// 處理錯誤
		return err
	}

	logrus.Infof("用戶 %d 刪除了家庭 %d", deleteUserID, id)

	return nil
}

func (s *FamilyService) GetFamilyByUser(userID uint) ([]models.Family, error) {
	// 獲取用戶的家庭成員關係
	members, err := s.familyRepo.FindMembersByUserID(userID)
	if err != nil {
		return nil, err // 返回 nil 或處理錯誤
	}

	var families []models.Family
	for _, member := range members {
		family, err := s.familyRepo.FindByID(member.FamilyID)
		if err != nil {
			return nil, err // 返回 nil 或處理錯誤
		}
		families = append(families, *family) // 將家庭添加到列表中
	}

	return families, nil // 返回所有家庭
}

func (s *FamilyService) UpdataMemberRole(SetterUserID, TargetUserID, familyID, role uint) error {
	if SetterUserID == TargetUserID {
		// 處理錯誤，例如用戶不能調整自己的權限
		return fmt.Errorf("用戶不能調整自己的權限")
	}

	// 檢查用戶是否在家庭中
	setterRole, err := s.familyRepo.GetMemberRole(SetterUserID, familyID)
	if err != nil {
		// 處理錯誤，例如無法獲取用戶角色
		return err
	}

	if setterRole != 1 && setterRole != 2 {
		// 處理錯誤，例如用戶不是創建者,不能調整家庭成員權限
		return fmt.Errorf("用戶沒有調整家庭成員權限的權限")
	}

	familyMember := &models.UserFamily{
		UserID:   TargetUserID,
		FamilyID: familyID,
		Role:     role,
	}

	err = s.familyRepo.UpdateFamilyMemberRole(familyMember)
	if err != nil {
		return err
	}

	logrus.Infof("用戶 %d 更新了家庭 %d 的成員 %d 的角色為 %d", SetterUserID, familyID, TargetUserID, role)

	return nil
}
