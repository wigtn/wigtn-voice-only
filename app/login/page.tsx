import Image from 'next/image';
import LoginForm from '@/components/auth/LoginForm';
import OAuthButtons from '@/components/auth/OAuthButtons';

export default function LoginPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 bg-gradient-to-b from-gray-900 to-gray-800">
      <div className="w-full max-w-sm space-y-6">
        {/* 로고 & 설명 */}
        <div className="text-center space-y-3">
          <div className="flex flex-col items-center justify-center gap-3 mb-4">
            <Image
              src="/logo.png"
              alt="WIGVO Logo"
              width={80}
              height={80}
              className="rounded-full shadow-lg shadow-cyan-500/20"
            />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              WIGVO
            </h1>
          </div>
          <p className="text-gray-300 text-base">
            AI 음성 비서로 전화를 대신 걸어드립니다
          </p>
        </div>

        {/* 이메일/비밀번호 로그인 폼 */}
        <LoginForm />

        {/* 구분선 */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-700" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-2 bg-gray-800 text-gray-500">또는</span>
          </div>
        </div>

        {/* OAuth 버튼들 */}
        <OAuthButtons />

        {/* 이용약관 안내 */}
        <p className="text-center text-xs text-gray-500 px-4">
          로그인 시{' '}
          <span className="underline cursor-pointer hover:text-gray-400">이용약관</span> 및{' '}
          <span className="underline cursor-pointer hover:text-gray-400">개인정보처리방침</span>에
          동의하게 됩니다.
        </p>
      </div>
    </div>
  );
}
