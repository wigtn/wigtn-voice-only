'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Mail, Lock, User, ArrowLeft } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 비밀번호 확인
    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    if (password.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다.');
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();
      
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (signUpError) {
        if (signUpError.message.includes('already registered')) {
          setError('이미 등록된 이메일입니다.');
        } else {
          setError(signUpError.message);
        }
        return;
      }

      setSuccess(true);
    } catch {
      setError('회원가입 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4 bg-gradient-to-b from-gray-900 to-gray-800">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
              <Mail className="size-8 text-green-400" />
            </div>
            <h2 className="text-xl font-bold text-white">이메일을 확인해주세요</h2>
            <p className="text-gray-400 text-sm">
              <span className="text-cyan-400">{email}</span>로 인증 메일을 보냈습니다.
              <br />
              메일의 링크를 클릭하여 회원가입을 완료해주세요.
            </p>
          </div>
          <Link href="/login">
            <Button
              variant="outline"
              className="w-full h-12 border-gray-700 text-gray-300 hover:bg-gray-800"
            >
              로그인 페이지로 돌아가기
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 bg-gradient-to-b from-gray-900 to-gray-800">
      <div className="w-full max-w-sm space-y-6">
        {/* 뒤로가기 */}
        <Link
          href="/login"
          className="inline-flex items-center gap-1 text-gray-400 hover:text-gray-300 text-sm"
        >
          <ArrowLeft className="size-4" />
          로그인으로 돌아가기
        </Link>

        {/* 로고 & 설명 */}
        <div className="text-center space-y-3">
          <div className="flex flex-col items-center justify-center gap-3">
            <Image
              src="/logo.png"
              alt="WIGVO Logo"
              width={60}
              height={60}
              className="rounded-full shadow-lg shadow-cyan-500/20"
            />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              회원가입
            </h1>
          </div>
        </div>

        {/* 회원가입 폼 */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 이름 입력 */}
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-500" />
            <Input
              type="text"
              placeholder="이름"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="pl-10 h-12 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:border-cyan-500 focus:ring-cyan-500"
            />
          </div>

          {/* 이메일 입력 */}
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-500" />
            <Input
              type="email"
              placeholder="이메일"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="pl-10 h-12 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:border-cyan-500 focus:ring-cyan-500"
            />
          </div>

          {/* 비밀번호 입력 */}
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-500" />
            <Input
              type="password"
              placeholder="비밀번호 (6자 이상)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="pl-10 h-12 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:border-cyan-500 focus:ring-cyan-500"
            />
          </div>

          {/* 비밀번호 확인 */}
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-500" />
            <Input
              type="password"
              placeholder="비밀번호 확인"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="pl-10 h-12 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:border-cyan-500 focus:ring-cyan-500"
            />
          </div>

          {/* 에러 메시지 */}
          {error && (
            <p className="text-sm text-red-400 text-center bg-red-900/20 py-2 px-3 rounded-lg">
              {error}
            </p>
          )}

          {/* 회원가입 버튼 */}
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-medium rounded-xl"
          >
            {isLoading ? (
              <>
                <Loader2 className="size-4 animate-spin mr-2" />
                가입 중...
              </>
            ) : (
              '회원가입'
            )}
          </Button>
        </form>

        {/* 이용약관 안내 */}
        <p className="text-center text-xs text-gray-500 px-4">
          가입 시{' '}
          <span className="underline cursor-pointer hover:text-gray-400">이용약관</span> 및{' '}
          <span className="underline cursor-pointer hover:text-gray-400">개인정보처리방침</span>에
          동의하게 됩니다.
        </p>
      </div>
    </div>
  );
}
