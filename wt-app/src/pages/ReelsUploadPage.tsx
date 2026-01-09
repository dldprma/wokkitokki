import React from "react";
import { ReelsUpload } from "../features/reels";

const ReelsUploadPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 p-4">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            릴스 업로드 (통합 버전)
          </h1>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-blue-900 mb-2">
              통합된 기능
            </h2>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>
                • <strong>업로드 요청:</strong> Presigned URL 발급 API에
                filename, contentType, reelsId 전송
              </li>
              <li>
                • <strong>진행률 표시:</strong> S3 업로드 진행률을 실시간으로
                표시
              </li>
              <li>
                • <strong>상태 폴링:</strong> 2초 간격으로 CloudFront JSON 상태
                확인
              </li>
              <li>
                • <strong>HLS 재생:</strong> Safari(네이티브)와
                Chrome/Firefox(hls.js) 모두 지원
              </li>
              <li>
                • <strong>UX 개선:</strong> 상태 표시, 재시도 버튼, 에러 처리
              </li>
              <li>
                • <strong>기존 UI 통합:</strong> 기존 릴스 업로드 UI와 완전 통합
              </li>
            </ul>
          </div>
        </div>

        <ReelsUpload />
      </div>
    </div>
  );
};

export default ReelsUploadPage;
