'use client';

import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';

export default function OAuthButtons() {
  const handleGoogleLogin = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  const handleKakaoLogin = async () => {
    // TODO: 카카오 OAuth 연동 후 활성화
    alert('카카오 로그인은 준비 중입니다.');
  };

  const handleAppleLogin = async () => {
    // TODO: Apple OAuth 연동 후 활성화
    alert('Apple 로그인은 준비 중입니다.');
  };

  return (
    <div className="flex items-center justify-center gap-6">
      {/* Google */}
      <button
        onClick={handleGoogleLogin}
        className="w-14 h-14 rounded-full bg-white hover:bg-gray-100 flex items-center justify-center transition-all shadow-lg hover:shadow-xl hover:scale-105"
        title="Google로 로그인"
      >
        <svg className="w-6 h-6" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
      </button>

      {/* Kakao */}
      <button
        onClick={handleKakaoLogin}
        className="w-14 h-14 rounded-full bg-[#FEE500] hover:bg-[#FDD835] flex items-center justify-center transition-all shadow-lg hover:shadow-xl hover:scale-105"
        title="카카오로 로그인"
      >
        <svg className="w-6 h-6" viewBox="0 0 24 24">
          <path
            fill="#3C1E1E"
            d="M12 3C6.48 3 2 6.58 2 11c0 2.84 1.87 5.33 4.67 6.75l-.95 3.52c-.08.3.26.54.52.37l4.14-2.73c.53.06 1.07.09 1.62.09 5.52 0 10-3.58 10-8s-4.48-8-10-8z"
          />
        </svg>
      </button>

      {/* Apple */}
      <button
        onClick={handleAppleLogin}
        className="w-14 h-14 rounded-full bg-black hover:bg-gray-900 flex items-center justify-center transition-all shadow-lg hover:shadow-xl hover:scale-105 border border-gray-700"
        title="Apple로 로그인"
      >
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="white">
          <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
        </svg>
      </button>
    </div>
  );
}
