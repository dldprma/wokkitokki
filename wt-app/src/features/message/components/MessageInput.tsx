import React, { useState, useRef, useCallback } from "react";
import "../../../css/MessageInput.css";

interface MessageInputProps {
  onSendMessage: (content: string, messageType: "text" | "image") => void;
  onSendFile?: (file: File) => void;
  onSendFiles?: (files: File[]) => void;
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
}

const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  onSendFile,
  onSendFiles,
  placeholder = "메시지를 입력하세요.",
  disabled = false,
  maxLength = 1000,
}) => {
  const [message, setMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<number | undefined>(undefined);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= maxLength) {
      setMessage(value);

      // 자동 높이 조절
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
        textareaRef.current.style.height = `${Math.min(
          textareaRef.current.scrollHeight,
          120
        )}px`;
      }

      // 타이핑 상태 관리
      setIsTyping(true);
      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = window.setTimeout(() => {
        setIsTyping(false);
      }, 1000);
    }
  };

  const handleSendMessage = useCallback(() => {
    const trimmedMessage = message.trim();
    if ((trimmedMessage || selectedImages.length > 0) && !disabled) {
      if (selectedImages.length > 0) {
        // 이미지가 있으면 이미지 먼저 전송
        if (onSendFiles) {
          onSendFiles(selectedImages);
        }
        setSelectedImages([]);
      }

      if (trimmedMessage) {
        onSendMessage(trimmedMessage, "text");
        setMessage("");
        if (textareaRef.current) {
          textareaRef.current.style.height = "auto";
        }
      }
    }
  }, [message, selectedImages, disabled, onSendMessage, onSendFiles]);

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      const imageFiles = files.filter((file) => file.type.startsWith("image/"));
      const otherFiles = files.filter(
        (file) => !file.type.startsWith("image/")
      );

      if (imageFiles.length > 0) {
        setSelectedImages((prev) => [...prev, ...imageFiles]);
      }

      if (otherFiles.length > 0 && onSendFile) {
        otherFiles.forEach((file) => onSendFile(file));
      }
    }

    // 파일 input 초기화
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="message-input-container">
      <div className="message-input-wrapper">
        <div className="message-textarea-container">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            disabled={disabled}
            className="message-textarea"
            rows={1}
          />
          <div className="character-count">
            {message.length}/{maxLength}
          </div>
        </div>

        <button
          className="input-button image-button"
          onClick={handleImageClick}
          disabled={disabled}
          type="button"
        >
          📷
        </button>

        <button
          className="input-button send-button"
          onClick={handleSendMessage}
          disabled={disabled || !message.trim()}
          type="button"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"
              fill="currentColor"
            />
          </svg>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          style={{ display: "none" }}
        />
      </div>

      {selectedImages.length > 0 && (
        <div className="image-preview-container">
          <div className="image-preview-list">
            {selectedImages.map((file, index) => (
              <div key={index} className="image-preview-item">
                <img
                  src={URL.createObjectURL(file)}
                  alt={`미리보기 ${index + 1}`}
                />
                <button
                  className="remove-image-btn"
                  onClick={() => removeImage(index)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {isTyping && (
        <div className="typing-indicator">
          <span>입력 중...</span>
        </div>
      )}
    </div>
  );
};

export default MessageInput;
