/**
 * AI 에러 분류 및 처리 시스템
 * - 에러 원인 자동 분류
 * - 해결 방법 안내
 * - 재시도 가능 여부 판단
 */

export type AIErrorType = 
  | 'API_KEY_MISSING'
  | 'API_KEY_INVALID'
  | 'MODEL_NOT_FOUND'
  | 'RATE_LIMIT'
  | 'QUOTA_EXCEEDED'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'INVALID_RESPONSE'
  | 'TEXT_MODIFIED'
  | 'UNKNOWN'

export type ErrorSeverity = 'critical' | 'high' | 'medium' | 'low'

export interface AIErrorInfo {
  type: AIErrorType
  message: string
  solution: string
  severity: ErrorSeverity
  canRetry: boolean
  icon: string
}

// 에러 타입별 상세 정보
export const AI_ERROR_TYPES: Record<AIErrorType, Omit<AIErrorInfo, 'type'>> = {
  API_KEY_MISSING: {
    message: 'API 키가 설정되지 않았습니다',
    solution: '.env.local 파일에 해당 API 키를 설정하세요 (GOOGLE_GEMINI_API_KEY, OPENAI_API_KEY 등)',
    severity: 'critical',
    canRetry: false,
    icon: '🔑',
  },
  API_KEY_INVALID: {
    message: 'API 키가 유효하지 않습니다',
    solution: 'API 제공업체 콘솔에서 새 API 키를 발급받으세요',
    severity: 'critical',
    canRetry: false,
    icon: '🔒',
  },
  MODEL_NOT_FOUND: {
    message: '요청한 AI 모델을 찾을 수 없습니다',
    solution: '다른 AI 모델을 선택하거나, 모델명이 정확한지 확인하세요',
    severity: 'high',
    canRetry: false,
    icon: '🤖',
  },
  RATE_LIMIT: {
    message: 'API 요청 한도를 초과했습니다',
    solution: '1분 후 다시 시도하거나, 다른 AI 모델을 사용하세요',
    severity: 'medium',
    canRetry: true,
    icon: '⏳',
  },
  QUOTA_EXCEEDED: {
    message: 'API 사용량 한도를 초과했습니다',
    solution: 'API 제공업체에서 요금제를 업그레이드하거나, 다른 모델을 사용하세요',
    severity: 'high',
    canRetry: false,
    icon: '💳',
  },
  NETWORK_ERROR: {
    message: '네트워크 연결에 문제가 있습니다',
    solution: '인터넷 연결을 확인하고 다시 시도하세요',
    severity: 'medium',
    canRetry: true,
    icon: '🌐',
  },
  TIMEOUT: {
    message: 'AI 응답 시간이 초과되었습니다',
    solution: '잠시 후 다시 시도하세요. 텍스트가 너무 길면 나눠서 처리하세요',
    severity: 'low',
    canRetry: true,
    icon: '⏱️',
  },
  INVALID_RESPONSE: {
    message: 'AI 응답을 처리할 수 없습니다',
    solution: '다시 시도하거나, 다른 AI 모델을 사용하세요',
    severity: 'medium',
    canRetry: true,
    icon: '📝',
  },
  TEXT_MODIFIED: {
    message: 'AI가 원문을 수정하여 결과를 사용할 수 없습니다',
    solution: 'Regex 결과가 자동으로 사용됩니다. 다른 AI 모델로 다시 시도해보세요',
    severity: 'medium',
    canRetry: true,
    icon: '⚠️',
  },
  UNKNOWN: {
    message: '알 수 없는 오류가 발생했습니다',
    solution: '잠시 후 다시 시도하거나, 다른 AI 모델을 사용하세요',
    severity: 'medium',
    canRetry: true,
    icon: '❓',
  },
}

/**
 * 에러 메시지로부터 에러 타입 분류
 */
export function classifyAIError(error: unknown): AIErrorInfo {
  const errorMessage = error instanceof Error ? error.message : String(error)
  const errorString = errorMessage.toLowerCase()
  
  let type: AIErrorType = 'UNKNOWN'
  
  // API 키 관련
  if (errorString.includes('api key') || errorString.includes('apikey')) {
    if (errorString.includes('not configured') || errorString.includes('설정되지') || errorString.includes('missing')) {
      type = 'API_KEY_MISSING'
    } else if (errorString.includes('invalid') || errorString.includes('unauthorized') || errorString.includes('401')) {
      type = 'API_KEY_INVALID'
    }
  }
  
  // 모델 관련
  else if (
    errorString.includes('model') && (errorString.includes('not found') || errorString.includes('404')) ||
    errorString.includes('is not found') ||
    errorString.includes('does not exist')
  ) {
    type = 'MODEL_NOT_FOUND'
  }
  
  // 요청 한도 관련
  else if (
    errorString.includes('rate limit') || 
    errorString.includes('too many requests') ||
    errorString.includes('429')
  ) {
    type = 'RATE_LIMIT'
  }
  
  // 할당량 관련
  else if (
    errorString.includes('quota') || 
    errorString.includes('billing') ||
    errorString.includes('exceeded')
  ) {
    type = 'QUOTA_EXCEEDED'
  }
  
  // 네트워크 관련
  else if (
    errorString.includes('network') || 
    errorString.includes('fetch') ||
    errorString.includes('econnrefused') ||
    errorString.includes('연결')
  ) {
    type = 'NETWORK_ERROR'
  }
  
  // 타임아웃 관련
  else if (
    errorString.includes('timeout') || 
    errorString.includes('timed out') ||
    errorString.includes('시간 초과')
  ) {
    type = 'TIMEOUT'
  }
  
  // JSON 파싱 관련
  else if (
    errorString.includes('json') || 
    errorString.includes('parse') ||
    errorString.includes('unexpected token')
  ) {
    type = 'INVALID_RESPONSE'
  }
  
  // 원문 수정 관련
  else if (
    errorString.includes('modified') || 
    errorString.includes('변형') ||
    errorString.includes('수정')
  ) {
    type = 'TEXT_MODIFIED'
  }
  
  return {
    type,
    ...AI_ERROR_TYPES[type],
  }
}

/**
 * 에러 정보를 사용자 친화적 형태로 포맷
 */
export function formatAIError(errorInfo: AIErrorInfo): string {
  return `${errorInfo.icon} ${errorInfo.message}`
}

/**
 * 상세 에러 객체 생성
 */
export function createDetailedError(
  error: unknown,
  context?: {
    model?: string
    provider?: string
    action?: string
  }
): {
  errorInfo: AIErrorInfo
  context?: typeof context
  timestamp: string
  originalError: string
} {
  const errorInfo = classifyAIError(error)
  
  return {
    errorInfo,
    context,
    timestamp: new Date().toISOString(),
    originalError: error instanceof Error ? error.message : String(error),
  }
}

/**
 * 에러 타입별 추천 AI 모델
 */
export function getAlternativeModel(
  currentModel: string,
  errorType: AIErrorType
): string | null {
  // 모델별 대안
  const alternatives: Record<string, string[]> = {
    'gemini-2.0-flash': ['gemini-2.5-flash', 'gpt-4o-mini', 'claude-3-haiku-20240307'],
    'gemini-2.5-flash': ['gemini-2.0-flash', 'gpt-4o-mini', 'claude-3-haiku-20240307'],
    'gemini-1.5-pro': ['gemini-2.0-flash', 'gpt-4o', 'claude-3-5-sonnet-20241022'],
    'gpt-4o-mini': ['gemini-2.0-flash', 'claude-3-haiku-20240307', 'gpt-4o'],
    'gpt-4o': ['gpt-4o-mini', 'claude-3-5-sonnet-20241022'],
    'claude-3-haiku-20240307': ['gpt-4o-mini', 'gemini-2.0-flash'],
    'claude-3-5-sonnet-20241022': ['gpt-4o', 'claude-3-haiku-20240307'],
  }
  
  const modelAlternatives = alternatives[currentModel]
  if (!modelAlternatives || modelAlternatives.length === 0) {
    return null
  }
  
  // 현재 모델과 다른 첫 번째 대안 반환
  return modelAlternatives[0]
}

