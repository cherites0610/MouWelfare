package dto

type FQAResp struct {
	Id       uint   `json:"-"`
	Question string `json:"question"`
	Answer   string `json:"answer"`
}
