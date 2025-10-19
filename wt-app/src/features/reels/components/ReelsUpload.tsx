import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { reelsApi } from "../api/reelsApi";
import { HlsVideoPlayer } from "./HlsVideoPlayer";
import type {
  VideoProcessingStatus,
  UploadProgress,
} from "../types/reelsTypes";
import "../../../css/Reels.css";

const ReelsUpload: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 업로드 상태
  const [uploadingFile, setUploadingFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDescription, setUploadDescription] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadStep, setUploadStep] = useState<string>("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [playUrl, setPlayUrl] = useState<string | null>(null);

  // CloudFront 도메인
  const CF_DOMAIN = "dceqn5cujj4m6.cloudfront.net";

  // 파일 선택
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("video/")) {
        alert("비디오 파일만 업로드 가능합니다.");
        return;
      }
      setUploadingFile(file);
    }
  };

  // 업로드 실행 (상태 폴링 포함)
  const handleUpload = async () => {
    if (!uploadingFile) {
      alert("비디오 파일을 선택해주세요.");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setPlayUrl(null);

    try {
      const result = await reelsApi.uploadReelsWithProcessing(
        uploadingFile,
        CF_DOMAIN,
        uploadTitle.trim() || "릴스",
        uploadDescription.trim() || "",
        // 업로드 진행률 콜백
        (progress: UploadProgress) => {
          setUploadProgress(progress.percentage);
          setUploadStep(`업로드 중... ${progress.percentage}%`);
        },
        // 처리 상태 업데이트 콜백
        (status: VideoProcessingStatus) => {
          setIsUploading(false);
          setIsProcessing(
            status.status !== "COMPLETE" && status.status !== "ERROR"
          );

          if (status.status === "PENDING") {
            setUploadStep("처리 대기 중...");
          } else if (status.status === "PROCESSING") {
            setUploadStep("인코딩 중...");
          }
        }
      );

      if (result.playUrl) {
        setPlayUrl(result.playUrl);
        setUploadStep("업로드 및 처리 완료!");
      } else {
        setUploadStep("업로드 완료! (처리 중...)");
      }
      setUploadProgress(100);
      setIsProcessing(false);

      alert(result.message);

      // 업로드 성공 시 릴스 페이지로 이동
      setTimeout(() => {
        navigate("/reels");
      }, 1000); // 1초 후 이동
    } catch (error) {
      console.error("❌ 릴스 업로드 실패:", error);
      alert("릴스 업로드에 실패했습니다.");
      setUploadStep("업로드 실패");
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
      setIsProcessing(false);
    }
  };

  // 취소
  const handleCancel = () => {
    navigate("/reels");
  };

  return (
    <div className="reel-create-page">
      <div className="reel-create-header">
        <button className="back-button" onClick={handleCancel}>
          ←
        </button>
        <h2>릴스 만들기</h2>
        <div></div>
      </div>

      <div className="reel-create-content">
        {/* 비디오 업로드 섹션 */}
        <div className="video-upload-section">
          <h3>비디오 업로드</h3>
          {!uploadingFile ? (
            <div
              className="video-upload-area"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="upload-icon">📹</div>
              <p>비디오 파일을 선택하세요</p>
              <span className="upload-hint">
                클릭하거나 드래그하여 파일을 업로드하세요
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileSelect}
                style={{ display: "none" }}
              />
            </div>
          ) : (
            <div className="video-preview">
              <div className="video-preview-container">
                <video
                  src={URL.createObjectURL(uploadingFile)}
                  controls
                  className="video-preview-player"
                >
                  브라우저가 비디오를 지원하지 않습니다.
                </video>
                <div className="video-info">
                  <span className="video-icon">📹</span>
                  <div className="video-details">
                    <div className="video-name">{uploadingFile.name}</div>
                    <div className="video-size">
                      {(uploadingFile.size / 1024 / 1024).toFixed(2)} MB
                    </div>
                  </div>
                  <button
                    className="change-video-button"
                    onClick={() => fileInputRef.current?.click()}
                    type="button"
                  >
                    변경
                  </button>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileSelect}
                style={{ display: "none" }}
              />
            </div>
          )}
        </div>

        {/* 릴스 정보 섹션 */}
        <div className="reel-info-section">
          <h3>릴스 정보</h3>
          <div className="form-group">
            <label>제목</label>
            <input
              type="text"
              value={uploadTitle}
              onChange={(e) => setUploadTitle(e.target.value)}
              placeholder="릴스 제목을 입력하세요"
              maxLength={100}
              disabled={isUploading}
            />
            <div className="char-count">{uploadTitle.length}/100</div>
          </div>
          <div className="form-group">
            <label>내용</label>
            <textarea
              value={uploadDescription}
              onChange={(e) => setUploadDescription(e.target.value)}
              placeholder="릴스 내용을 입력하세요"
              maxLength={500}
              rows={6}
              disabled={isUploading}
            />
            <div className="char-count">{uploadDescription.length}/500</div>
          </div>
        </div>

        {/* 업로드 진행률 */}
        {(isUploading || isProcessing) && (
          <div className="upload-progress">
            <div className="progress-bar-container">
              <div
                className="progress-bar-fill"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <div className="progress-text">
              {uploadStep || "처리 중..."} ({uploadProgress}%)
            </div>
          </div>
        )}

        {/* HLS 비디오 플레이어 (업로드 완료 후) */}
        {playUrl && (
          <div className="video-player-section">
            <h3>업로드된 비디오</h3>
            <div className="hls-video-container">
              <HlsVideoPlayer
                playUrl={playUrl}
                autoplay={false}
                muted={true}
                loop={false}
                controls={true}
                className="hls-video-player"
              />
            </div>
          </div>
        )}

        {/* 액션 버튼들 */}
        <div className="create-actions">
          <button
            className="cancel-button"
            onClick={handleCancel}
            disabled={isUploading}
          >
            취소
          </button>
          <button
            className="upload-button"
            onClick={handleUpload}
            disabled={isUploading || !uploadingFile}
          >
            {isUploading ? uploadStep || "업로드 중..." : "릴스 공유하기"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReelsUpload;
