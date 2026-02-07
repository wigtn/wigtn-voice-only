'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Loader2, Mail, Lock } from 'lucide-react';

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const supabase = createClient();

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        if (signInError.message.includes('Invalid login credentials')) {
          setError('이메일 또는 비밀번호가 올바르지 않습니다.');
        } else if (signInError.message.includes('Email not confirmed')) {
          setError('이메일 인증이 필요합니다. 메일함을 확인해주세요.');
        } else {
          setError(signInError.message);
        }
        return;
      }

      router.push('/');
      router.refresh();
    } catch {
      setError('로그인 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* 이메일 */}
      <div className="relative">
        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[#94A3B8]" />
        <input
          type="email"
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full pl-11 pr-4 h-12 rounded-xl bg-white border border-[#E2E8F0] text-[#0F172A] text-sm placeholder:text-[#94A3B8] focus:outline-none focus:border-[#94A3B8] focus:ring-2 focus:ring-[#F1F5F9] transition-all"
        />
      </div>

      {/* 비밀번호 */}
      <div className="relative">
        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[#94A3B8]" />
        <input
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full pl-11 pr-4 h-12 rounded-xl bg-white border border-[#E2E8F0] text-[#0F172A] text-sm placeholder:text-[#94A3B8] focus:outline-none focus:border-[#94A3B8] focus:ring-2 focus:ring-[#F1F5F9] transition-all"
        />
      </div>

      {/* 에러 */}
      {error && (
        <p className="text-sm text-red-600 text-center bg-red-50 border border-red-200 py-2 px-3 rounded-xl">
          {error}
        </p>
      )}

      {/* 로그인 버튼 */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full h-12 bg-[#0F172A] hover:bg-[#1E293B] text-white font-medium rounded-xl transition-all disabled:opacity-50 shadow-sm flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            로그인 중...
          </>
        ) : (
          '로그인'
        )}
      </button>

      {/* 회원가입 */}
      <p className="text-center text-sm text-[#94A3B8]">
        계정이 없으신가요?{' '}
        <a href="/signup" className="text-[#0F172A] font-medium hover:underline">
          회원가입
        </a>
      </p>
    </form>
  );
}
