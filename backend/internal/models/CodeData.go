package models

type CodeMode uint

type CodeData struct {
	CodeMode CodeMode //1是短信驗證碼 2是家庭驗證碼
	FmailyID *uint
	UserID   *uint
	Email    string
}
