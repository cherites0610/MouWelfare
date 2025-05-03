package service

import (
	"Mou-Welfare/internal/config"
	"Mou-Welfare/internal/repository"
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/resend/resend-go/v2"
	"github.com/sirupsen/logrus"
)

type MessageService struct {
	userRepo *repository.UserRerpository
	cfg      *config.Config
	log      *logrus.Logger
}

func NewMessageService(userRepo *repository.UserRerpository, cfg *config.Config, log *logrus.Logger) *MessageService {
	return &MessageService{
		userRepo: userRepo,
		cfg:      cfg,
		log:      log,
	}
}

func (m *MessageService) SendLineMessage(message string, LineUserID string) error {
	// 定義請求的 payload 結構
	type Message struct {
		Type string `json:"type"`
		Text string `json:"text"`
	}

	type PushPayload struct {
		To       string    `json:"to"`
		Messages []Message `json:"messages"`
	}

	// 構建 payload
	payload := PushPayload{
		To: LineUserID,
		Messages: []Message{
			{Type: "text", Text: message},
		},
	}

	// 將 payload 轉為 JSON
	jsonData, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	fmt.Println(jsonData)
	// 創建 HTTP 請求
	req, err := http.NewRequest("POST", m.cfg.LINE_SEND_MESSAGE_APIURL, bytes.NewBuffer(jsonData))
	if err != nil {
		return err
	}

	// 設置請求頭
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+m.cfg.LINE_CHANNEL_ACCESS_TOKEN)

	// 發送請求
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	// 檢查響應狀態碼
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("unexpected status code: %d", resp.StatusCode)
	}

	m.log.WithFields(logrus.Fields{
		"LineUserID": LineUserID,
		"message":    message,
	}).Info("Line訊息發送成功")

	return nil
}

func (m *MessageService) SendEmailMessage(email, subject, body string) error {
	apiKey := m.cfg.RESEND_API_KEY

	client := resend.NewClient(apiKey)

	params := &resend.SendEmailRequest{
		From:    fmt.Sprintf("Mou <%s>", m.cfg.EMAIL_DOMAIN),
		To:      []string{email},
		Html:    fmt.Sprintf("<strong>%s</strong>", body),
		Subject: subject,
	}

	_, err := client.Emails.Send(params)
	if err != nil {
		fmt.Println(err.Error())
		return err
	}

	m.log.WithFields(logrus.Fields{
		"email":   email,
		"subject": subject,
		"body":    body,
	}).Info("Email發送成功")
	return nil
}
