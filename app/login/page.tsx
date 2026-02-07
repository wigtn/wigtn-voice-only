import LoginButton from '@/components/auth/LoginButton';
import { Phone } from 'lucide-react';

export default function LoginPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      <div className="w-full max-w-sm space-y-8">
        {/* 로고 & 설명 */}
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Phone className="size-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-blue-600">WIGVO</h1>
          </div>
          <p className="text-gray-600 text-base">
            AI 음성 비서로 전화를 대신 걸어드립니다
          </p>
          <p className="text-gray-400 text-sm">
            예약, 문의, 확인 전화를 채팅으로 요청하세요
          </p>
        </div>

        {/* OAuth 로그인 버튼 */}
        <div className="space-y-3">
          <LoginButton
            provider="google"
            label="Google로 계속하기"
            icon="G"
          />
          <LoginButton
            provider="apple"
            label="Apple로 계속하기"
            icon="🍎"
          />
          <LoginButton
            provider="kakao"
            label="카카오로 계속하기"
            icon="💬"
          />
        </div>

        {/* 이용약관 안내 */}
        <p className="text-center text-xs text-gray-400 px-4">
          로그인 시{' '}
          <span className="underline cursor-pointer">이용약관</span> 및{' '}
          <span className="underline cursor-pointer">개인정보처리방침</span>에
          동의하게 됩니다.
        </p>
      </div>
    </div>
  );
}
