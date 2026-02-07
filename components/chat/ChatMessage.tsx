'use client';

import type { Message } from '@/shared/types';
import { cn } from '@/lib/utils';

interface ChatMessageProps {
  message: Message;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div
      className={cn('flex w-full mb-3', isUser ? 'justify-end' : 'justify-start')}
    >
      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap',
          isUser
            ? 'bg-blue-600 text-white rounded-br-md'
            : 'bg-white text-gray-800 border border-gray-200 rounded-bl-md'
        )}
      >
        {!isUser && (
          <div className="text-xs text-gray-400 font-medium mb-1">🤖 AI 비서</div>
        )}
        {message.content}
      </div>
    </div>
  );
}
