/**
 * 출력 설정 프리셋 시스템
 * 
 * 문제 그룹(question_group)별로 최적화된 OutputConfig를 제공합니다.
 * 사용자는 question_group만 선택하면 자동으로 적절한 프리셋이 적용됩니다.
 */

import type { OutputConfig } from '@/types/output-config'
import {
  DEFAULT_OUTPUT_CONFIG,
  DEFAULT_PAPER_CONFIG,
  DEFAULT_TYPOGRAPHY_CONFIG,
  DEFAULT_OUTPUT_OPTIONS,
} from '@/types/output-config'

/**
 * 문제 그룹별 기본 프리셋
 */
export const OUTPUT_PRESETS: Record<string, OutputConfig> = {
  /**
   * 수능형 (CSAT)
   * - 2단 레이아웃 (지문 좌측, 문제 우측)
   * - 세로형 선택지, 동그라미 번호
   */
  csat: {
    version: '2.0',
    columns: 2,
    columnRatio: [50, 50],
    columnGap: 5,
    fields: [
      { key: 'passage', label: '지문', span: 1 },
      { key: 'question', label: '문제', span: 1 },
      { key: 'choices', label: '선택지', span: 1 },
      { key: 'answer', label: '정답', showIn: ['student_answer', 'teacher', 'answer_only'] },
      { key: 'explanation', label: '해설', showIn: ['teacher'] },
    ],
    pageBreak: {
      mode: 'smart',
      unit: 'passage',
      minSpaceThreshold: 50,
      avoidOrphans: true,
    },
    paper: DEFAULT_PAPER_CONFIG,
    typography: DEFAULT_TYPOGRAPHY_CONFIG,
    options: {
      ...DEFAULT_OUTPUT_OPTIONS,
      choiceLayout: 'vertical',
      choiceMarker: 'circled',
    },
  },

  /**
   * 내신형 - 지문별 (School - Passage)
   * - 1단 레이아웃
   * - 지문 상단 고정
   * - 지문 단위로 페이지 분할
   */
  school_passage: {
    version: '2.0',
    columns: 1,
    fields: [
      { key: 'passage', label: '지문', span: 1 },
      { key: 'question', label: '문제', span: 1 },
      { key: 'choices', label: '선택지', span: 1 },
      { key: 'answer', label: '정답', showIn: ['student_answer', 'teacher', 'answer_only'] },
      { key: 'explanation', label: '해설', showIn: ['teacher'] },
    ],
    pageBreak: {
      mode: 'smart',
      unit: 'passage',
      minSpaceThreshold: 70, // 가독성 우선
      avoidOrphans: true,
    },
    paper: DEFAULT_PAPER_CONFIG,
    typography: DEFAULT_TYPOGRAPHY_CONFIG,
    options: {
      ...DEFAULT_OUTPUT_OPTIONS,
      choiceLayout: 'vertical',
      choiceMarker: 'circled',
    },
  },

  /**
   * 내신형 - 문장별 (School - Sentence)
   * - 1단 레이아웃
   * - 문장-문제 쌍 반복
   * - 문장 단위로 페이지 분할
   */
  school_sentence: {
    version: '2.0',
    columns: 1,
    fields: [
      { key: 'sentence', label: '문장' },
      { key: 'question', label: '문제' },
      { key: 'choices', label: '선택지' },
      { key: 'answer', label: '정답', showIn: ['student_answer', 'teacher', 'answer_only'] },
      { key: 'explanation', label: '해설', showIn: ['teacher'] },
    ],
    repeat: true, // 문장별 반복
    pageBreak: {
      mode: 'smart',
      unit: 'sentence',
      minSpaceThreshold: 40, // 공간 활용 우선
      avoidOrphans: true,
    },
    paper: DEFAULT_PAPER_CONFIG,
    typography: DEFAULT_TYPOGRAPHY_CONFIG,
    options: {
      ...DEFAULT_OUTPUT_OPTIONS,
      choiceLayout: 'vertical',
      choiceMarker: 'circled',
    },
  },

  /**
   * 학습자료형 (Study Material)
   * - 1단 레이아웃
   * - 연속 흐름 (정답/해설 없음)
   * - 지문 단위로 페이지 분할
   */
  study: {
    version: '2.0',
    columns: 1,
    fields: [
      { key: 'passage', label: '지문' },
      { key: 'translation', label: '해석' },
      { key: 'vocabulary', label: '어휘' },
      { key: 'grammar', label: '문법' },
      { key: 'structure', label: '구조 분석' },
    ],
    pageBreak: {
      mode: 'smart',
      unit: 'passage',
      minSpaceThreshold: 50,
      avoidOrphans: true,
    },
    paper: DEFAULT_PAPER_CONFIG,
    typography: {
      ...DEFAULT_TYPOGRAPHY_CONFIG,
      lineHeight: 1.6, // 학습자료는 줄간격 조금 더 넓게
    },
    options: {
      ...DEFAULT_OUTPUT_OPTIONS,
      pageNumbers: true,
      choiceMarker: 'numbered',
      choiceLayout: 'vertical',
    },
  },
}

/**
 * question_group에 맞는 프리셋 가져오기
 * 
 * @param group - 문제 그룹 ('csat', 'school_passage', 'school_sentence', 'study')
 * @returns OutputConfig 프리셋 (없으면 기본값)
 */
export function getPresetForGroup(group: string): OutputConfig {
  return OUTPUT_PRESETS[group] || DEFAULT_OUTPUT_CONFIG
}

/**
 * 사용 가능한 프리셋 목록 (UI 선택용)
 */
export const PRESET_OPTIONS = [
  {
    value: 'csat',
    label: '수능형',
    description: '2단 레이아웃, 지문 좌측/문제 우측',
    icon: '📝',
  },
  {
    value: 'school_passage',
    label: '내신형 (지문별)',
    description: '1단 레이아웃, 지문 상단 고정',
    icon: '📄',
  },
  {
    value: 'school_sentence',
    label: '내신형 (문장별)',
    description: '1단 레이아웃, 문장-문제 쌍',
    icon: '✏️',
  },
  {
    value: 'study',
    label: '학습자료형',
    description: '1단 레이아웃, 연속 흐름',
    icon: '📚',
  },
]

/**
 * 프리셋에 사용자 정의 설정 병합
 * 
 * @param preset - 기본 프리셋
 * @param overrides - 사용자 정의 설정
 * @returns 병합된 OutputConfig
 */
export function mergePresetWithOverrides(
  preset: OutputConfig,
  overrides: Partial<OutputConfig>
): OutputConfig {
  return {
    ...preset,
    ...overrides,
    fields: overrides.fields || preset.fields,
    pageBreak: {
      ...preset.pageBreak,
      ...overrides.pageBreak,
    },
    paper: {
      ...preset.paper,
      ...overrides.paper,
      margins: {
        ...preset.paper.margins,
        ...overrides.paper?.margins,
      },
    },
    typography: {
      ...preset.typography,
      ...overrides.typography,
    },
    options: {
      ...preset.options,
      ...overrides.options,
    },
  }
}




