import api from "../../../utils/axios";
import type {
  Reel,
  GetReelsResponse,
  ReelsUploadResponse,
  VideoProcessingStatus,
  UploadProgress,
} from "../types/reelsTypes";

export class ReelsApi {
  // 릴스 목록 조회 (백엔드 GET /api/reels)
  static async getReels(page = 0, size = 10): Promise<GetReelsResponse> {
    const response = await api.get("/api/reels", {
      params: { page, size },
    });
    return response.data;
  }

  // 특정 릴스 조회 (백엔드 GET /api/reels/{id})
  static async getReel(reelId: number): Promise<Reel> {
    const response = await api.get(`/api/reels/${reelId}`);
    return response.data;
  }

  // 릴스 업로드 URL 받기 (백엔드 POST /api/reels/upload-url)
  static async getReelsUploadUrl(
    originalFilename: string,
    contentType: string,
    title?: string,
    description?: string
  ): Promise<ReelsUploadResponse> {
    const requestData = {
      originalFilename,
      contentType,
      title: title || "릴스",
      description: description || "",
    };

    const response = await api.post("/api/reels/upload-url", requestData);

    return response.data;
  }

  // S3에 파일 업로드
  static async uploadToS3(uploadUrl: string, file: File): Promise<void> {
    const response = await fetch(uploadUrl, {
      method: "PUT",
      body: file,
      headers: {
        "Content-Type": file.type,
      },
    });

    if (!response.ok) {
      throw new Error(
        `S3 업로드 실패: ${response.status} ${response.statusText}`
      );
    }
  }

  // S3에 파일 업로드 (진행률 표시)
  static async uploadToS3WithProgress(
    presignedUrl: string,
    file: File,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // 업로드 진행률 추적
      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable && onProgress) {
          const progress: UploadProgress = {
            loaded: event.loaded,
            total: event.total,
            percentage: Math.round((event.loaded / event.total) * 100),
          };
          onProgress(progress);
        }
      });

      // 업로드 완료
      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          console.error("❌ S3 업로드 실패:", xhr.status, xhr.statusText);
          reject(new Error(`S3 업로드 실패: ${xhr.status} ${xhr.statusText}`));
        }
      });

      // 업로드 에러
      xhr.addEventListener("error", () => {
        console.error("❌ S3 업로드 에러");
        reject(new Error("S3 업로드 중 네트워크 에러가 발생했습니다."));
      });

      // 업로드 중단
      xhr.addEventListener("abort", () => {
        console.warn("⚠️ S3 업로드 중단됨");
        reject(new Error("업로드가 중단되었습니다."));
      });

      xhr.open("PUT", presignedUrl);
      xhr.setRequestHeader("Content-Type", file.type);
      xhr.send(file);
    });
  }

  // CloudFront 상태 폴링 (2초 간격) - JSON 형태로 데이터 가져오기
  static async pollVideoStatus(
    videoId: string,
    cfDomain: string,
    onStatusUpdate?: (status: VideoProcessingStatus) => void
  ): Promise<VideoProcessingStatus> {
    return new Promise((resolve, reject) => {
      const pollInterval = setInterval(async () => {
        try {
          const statusUrl = `https://${cfDomain}/status/${videoId}.json?t=${Date.now()}`;

          const response = await fetch(statusUrl, { cache: "no-store" });

          if (!response.ok) {
            throw new Error(`상태 확인 실패: ${response.status}`);
          }

          const jsonData = await response.json();

          // JSON에서 필요한 정보 추출
          const status: VideoProcessingStatus = {
            status: jsonData.status || "PENDING",
            playUrl: jsonData.finalURL || jsonData.hlsURL || jsonData.playUrl,
            errorMessage: jsonData.errorMessage || jsonData.error,
            progress: jsonData.progress,
          };

          if (onStatusUpdate) {
            onStatusUpdate(status);
          }

          if (status.status === "COMPLETE") {
            clearInterval(pollInterval);
            resolve(status);
          } else if (status.status === "ERROR") {
            clearInterval(pollInterval);
            console.error("❌ 비디오 처리 실패:", status.errorMessage);
            reject(
              new Error(
                status.errorMessage || "비디오 처리 중 오류가 발생했습니다."
              )
            );
          }
        } catch (error) {
          console.error("❌ 상태 폴링 에러:", error);
          clearInterval(pollInterval);
          reject(error);
        }
      }, 2000); // 2초 간격

      // 5분 후 타임아웃
      setTimeout(() => {
        clearInterval(pollInterval);
        reject(new Error("비디오 처리 시간이 초과되었습니다."));
      }, 300000);
    });
  }

  // 통합 업로드 플로우 (상태 폴링 포함)
  static async uploadReelsWithProcessing(
    videoFile: File,
    cfDomain: string,
    title?: string,
    description?: string,
    onProgress?: (progress: UploadProgress) => void,
    onStatusUpdate?: (status: VideoProcessingStatus) => void
  ): Promise<{
    reelsId: number;
    playUrl?: string;
    message: string;
  }> {
    try {
      // 1. 릴스 업로드 URL 받기
      const uploadResponse = await this.getReelsUploadUrl(
        videoFile.name,
        videoFile.type,
        title,
        description
      );

      // 2. S3에 파일 업로드 (진행률 표시)
      await this.uploadToS3WithProgress(
        uploadResponse.presignedUrl,
        videoFile,
        onProgress
      );

      // 3. 잠시 대기 후 videoId로 상태 폴링 시작
      // (Lambda가 처리할 시간을 주고, DB에서 videoId를 가져와야 함)
      await new Promise((resolve) => setTimeout(resolve, 2000)); // 2초 대기

      // 4. 릴스 정보를 다시 가져와서 videoId 획득
      const reelInfo = await this.getReel(uploadResponse.reelsId);

      if (!reelInfo.videoId) {
        console.warn(
          "⚠️ videoId를 찾을 수 없습니다. 업로드는 성공했지만 재생은 나중에 처리됩니다."
        );
        return {
          reelsId: uploadResponse.reelsId,
          message:
            "업로드가 완료되었습니다. 비디오 처리가 완료되면 재생할 수 있습니다.",
        };
      }

      // 5. 상태 폴링 시도 (실패해도 업로드는 성공으로 처리)
      try {
        const finalStatus = await this.pollVideoStatus(
          reelInfo.videoId,
          cfDomain,
          onStatusUpdate
        );

        return {
          reelsId: uploadResponse.reelsId,
          playUrl: finalStatus.playUrl!,
          message: "업로드 및 처리가 완료되었습니다.",
        };
      } catch (pollingError) {
        console.warn("⚠️ 상태 폴링 실패, 하지만 업로드는 성공:", pollingError);
        return {
          reelsId: uploadResponse.reelsId,
          message:
            "업로드가 완료되었습니다. 비디오 처리가 완료되면 재생할 수 있습니다.",
        };
      }
    } catch (error) {
      console.error("❌ 릴스 업로드 실패:", error);
      throw error;
    }
  }

  // 릴스 업로드 플로우 (기본 - 상태 폴링 없음)
  static async uploadReels(
    videoFile: File,
    title?: string,
    description?: string
  ): Promise<{ reelsId: number; message: string }> {
    // 1. 릴스 업로드 URL 받기
    const uploadResponse = await this.getReelsUploadUrl(
      videoFile.name,
      videoFile.type,
      title,
      description
    );

    // 2. S3에 파일 업로드
    await this.uploadToS3(uploadResponse.presignedUrl, videoFile);

    // 3. Lambda가 자동으로 처리 완료 후 callback 호출

    return {
      reelsId: uploadResponse.reelsId,
      message: "업로드가 완료되었습니다. Lambda가 자동으로 처리합니다.",
    };
  }

  // 릴스 수정 (백엔드 PUT /api/reels/{id})
  static async updateReel(
    reelId: number,
    title: string,
    description?: string
  ): Promise<Reel> {
    const response = await api.put(`/api/reels/${reelId}`, {
      title,
      description,
    });
    return response.data;
  }

  // 릴스 삭제 (백엔드 DELETE /api/reels/{id})
  static async deleteReel(reelId: number): Promise<void> {
    await api.delete(`/api/reels/${reelId}`);
  }

  // 릴스 좋아요 (백엔드 POST /api/reels/{id}/like)
  static async likeReel(reelId: number): Promise<void> {
    await api.post(`/api/reels/${reelId}/like`);
  }

  // 릴스 공유 (백엔드 POST /api/reels/{id}/share)
  static async shareReel(
    reelId: number,
    targetUserIds: number[]
  ): Promise<void> {
    await api.post(`/api/reels/${reelId}/share`, {
      targetUserIds,
    });
  }

  // 공유할 팔로잉 목록 조회 (백엔드 GET /api/reels/share/following)
  static async getFollowingForShare(page = 0, size = 20): Promise<any> {
    const response = await api.get("/api/reels/share/following", {
      params: { page, size },
    });
    return response.data;
  }

  // 릴스 댓글 목록 조회 (백엔드 GET /api/reels/{id}/comments)
  static async getReelComments(
    reelId: number,
    page = 0,
    size = 10
  ): Promise<any> {
    const response = await api.get(`/api/reels/${reelId}/comments`, {
      params: { page, size },
    });
    return response.data;
  }

  // 릴스 댓글 작성 (백엔드 POST /api/reels/{id}/comments)
  static async createReelComment(
    reelId: number,
    content: string
  ): Promise<any> {
    const response = await api.post(`/api/reels/${reelId}/comments`, {
      content,
    });
    return response.data;
  }

  // 릴스 대댓글 작성 (백엔드 POST /api/reels/{id}/comments/{commentId}/reply)
  static async createReelReply(
    reelId: number,
    commentId: number,
    content: string
  ): Promise<any> {
    const response = await api.post(
      `/api/reels/${reelId}/comments/${commentId}/reply`,
      {
        content,
      }
    );
    return response.data;
  }
}

// 편의를 위한 함수들
export const reelsApi = {
  // 조회
  getReels: ReelsApi.getReels,
  getReel: ReelsApi.getReel,

  // 업로드
  getReelsUploadUrl: ReelsApi.getReelsUploadUrl,
  uploadToS3: ReelsApi.uploadToS3,
  uploadToS3WithProgress: ReelsApi.uploadToS3WithProgress,
  uploadReels: ReelsApi.uploadReels,
  uploadReelsWithProcessing: ReelsApi.uploadReelsWithProcessing,
  pollVideoStatus: ReelsApi.pollVideoStatus,

  // 수정/삭제
  updateReel: ReelsApi.updateReel,
  deleteReel: ReelsApi.deleteReel,

  // 좋아요/공유
  likeReel: ReelsApi.likeReel,
  shareReel: ReelsApi.shareReel,
  getFollowingForShare: ReelsApi.getFollowingForShare,

  // 댓글
  getReelComments: ReelsApi.getReelComments,
  createReelComment: ReelsApi.createReelComment,
  createReelReply: ReelsApi.createReelReply,
};
