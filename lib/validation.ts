/**
 * 채팅 메시지 유효성 검사
 */
export function validateMessage(message: string): { valid: boolean; error?: string } {
  const trimmed = message.trim();

  if (!trimmed) {
    return { valid: false, error: '메시지를 입력해주세요.' };
  }

  if (trimmed.length > 1000) {
    return { valid: false, error: '메시지는 1000자 이내로 입력해주세요.' };
  }

  return { valid: true };
}

/**
 * 전화번호 형식 검사 (한국 전화번호)
 */
export function isValidPhoneNumber(phone: string): boolean {
  const cleaned = phone.replace(/[\s-]/g, '');
  return /^(0[0-9]{1,2})[0-9]{3,4}[0-9]{4}$/.test(cleaned);
}
