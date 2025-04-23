package logger

import (
	"Mou-Welfare/internal/config"
	"os"

	"github.com/sirupsen/logrus"
)

// FileHook 是一個自定義 Hook，將日誌寫入文件（無顏色）
type FileHook struct {
	File      *os.File
	Formatter logrus.Formatter
	Level     []logrus.Level
}

func (hook *FileHook) Fire(entry *logrus.Entry) error {
	line, err := hook.Formatter.Format(entry)
	if err != nil {
		return err
	}
	_, err = hook.File.Write(line)
	return err
}

func (hook *FileHook) Levels() []logrus.Level {
	return hook.Level
}

func NewLogrusLogger(cfg *config.Config) *logrus.Logger {
	// 創建 Logrus 實例
	log := logrus.New()

	// 設置終端輸出（彩色）
	log.SetOutput(os.Stdout)
	log.SetFormatter(&logrus.TextFormatter{
		ForceColors:     true,
		FullTimestamp:   true,
		TimestampFormat: "2006-01-02 15:04:05",
	})
	level, err := logrus.ParseLevel(cfg.LOG_LEVEL)
	if err != nil {
		log.Fatal("Invalid log level: ", err)
	}
	log.SetLevel(level)

	// 打開日誌文件
	file, err := os.OpenFile(cfg.LOG_FILE_PATH, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0666)
	if err != nil {
		log.Fatal("Cannot open log file: ", err)
	}

	// 添加文件 Hook（無顏色，JSON 格式）
	fileHook := &FileHook{
		File: file,
		Formatter: &logrus.JSONFormatter{
			TimestampFormat: "2006-01-02 15:04:05",
		},
		Level: []logrus.Level{
			logrus.DebugLevel,
			logrus.InfoLevel,
			logrus.WarnLevel,
			logrus.ErrorLevel,
			logrus.FatalLevel,
			logrus.PanicLevel,
		},
	}
	log.Hooks.Add(fileHook)

	log.Info("日志系統初始化完成")
	log.Info("當前日誌級別: ", cfg.LOG_LEVEL)
	log.Info("日誌文件路徑: ", cfg.LOG_FILE_PATH)

	return log
}
