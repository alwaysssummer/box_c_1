/**
 * 페이지 분할 유틸리티
 * 
 * OutputConfig의 pageBreak 설정에 따라 문제를 페이지별로 분할합니다.
 */

import type { OutputConfig, PageBreakMode, PageBreakUnit } from '@/types/output-config'

export interface PaginatedPage {
  pageNumber: number
  questions: Array<{
    id: string
    [key: string]: unknown
  }>
  startIndex: number
  endIndex: number
}

/**
 * A4 세로 기준 예상 높이 계산 (단순 추정)
 * 실제로는 내용의 길이에 따라 동적으로 계산해야 하지만,
 * 여기서는 간단한 휴리스틱 사용
 */
function estimateQuestionHeight(question: Record<string, unknown>): number {
  let height = 50 // 기본 여백

  // passage가 있으면 높이 추가
  if (question.passage && typeof question.passage === 'string') {
    height += Math.max(100, question.passage.length / 3)
  }

  // question이 있으면 높이 추가
  if (question.question && typeof question.question === 'string') {
    height += Math.max(50, question.question.length / 4)
  }

  // choices가 있으면 높이 추가
  if (question.choices && Array.isArray(question.choices)) {
    height += question.choices.length * 25
  }

  // answer가 있으면 높이 추가
  if (question.answer) {
    height += 30
  }

  // explanation이 있으면 높이 추가
  if (question.explanation && typeof question.explanation === 'string') {
    height += Math.max(50, question.explanation.length / 4)
  }

  return height
}

/**
 * 자유 흐름 모드 페이지네이션
 * 페이지당 최대 높이까지 문제를 채움
 */
function paginateByFlow(
  questions: Array<{ id: string; [key: string]: unknown }>,
  maxHeightPerPage: number = 1000
): PaginatedPage[] {
  const pages: PaginatedPage[] = []
  let currentPage: typeof questions = []
  let currentHeight = 0
  let startIndex = 0

  questions.forEach((question, index) => {
    const questionHeight = estimateQuestionHeight(question)

    // 현재 페이지에 추가하면 넘칠 경우
    if (currentHeight + questionHeight > maxHeightPerPage && currentPage.length > 0) {
      pages.push({
        pageNumber: pages.length + 1,
        questions: currentPage,
        startIndex,
        endIndex: startIndex + currentPage.length - 1,
      })
      currentPage = [question]
      currentHeight = questionHeight
      startIndex = index
    } else {
      currentPage.push(question)
      currentHeight += questionHeight
    }
  })

  // 마지막 페이지 추가
  if (currentPage.length > 0) {
    pages.push({
      pageNumber: pages.length + 1,
      questions: currentPage,
      startIndex,
      endIndex: startIndex + currentPage.length - 1,
    })
  }

  return pages
}

/**
 * Smart 모드 페이지네이션
 * 단위(passage/sentence/item)별로 분할하되, 공간이 충분하면 같은 페이지에 배치
 */
function paginateBySmart(
  questions: Array<{ id: string; [key: string]: unknown }>,
  unit: PageBreakUnit,
  minSpaceThreshold: number = 50,
  maxHeightPerPage: number = 1000
): PaginatedPage[] {
  const pages: PaginatedPage[] = []
  let currentPage: typeof questions = []
  let currentHeight = 0
  let startIndex = 0

  questions.forEach((question, index) => {
    const questionHeight = estimateQuestionHeight(question)
    const remainingSpace = maxHeightPerPage - currentHeight
    const requiredSpace = questionHeight
    const spacePercent = (remainingSpace / maxHeightPerPage) * 100

    // Smart 분할 로직:
    // 1. 남은 공간이 threshold 이하면 새 페이지
    // 2. 현재 항목이 들어갈 공간이 없으면 새 페이지
    const shouldBreak = 
      (spacePercent < minSpaceThreshold && currentPage.length > 0) ||
      (currentHeight + requiredSpace > maxHeightPerPage && currentPage.length > 0)

    if (shouldBreak) {
      pages.push({
        pageNumber: pages.length + 1,
        questions: currentPage,
        startIndex,
        endIndex: startIndex + currentPage.length - 1,
      })
      currentPage = [question]
      currentHeight = questionHeight
      startIndex = index
    } else {
      currentPage.push(question)
      currentHeight += questionHeight
    }
  })

  // 마지막 페이지 추가
  if (currentPage.length > 0) {
    pages.push({
      pageNumber: pages.length + 1,
      questions: currentPage,
      startIndex,
      endIndex: startIndex + currentPage.length - 1,
    })
  }

  return pages
}

/**
 * 문제 목록을 페이지별로 분할
 * 
 * @param questions - 문제 목록
 * @param config - 출력 설정
 * @returns 페이지별로 분할된 문제 목록
 */
export function paginateQuestions(
  questions: Array<{ id: string; [key: string]: unknown }>,
  config: OutputConfig
): PaginatedPage[] {
  // 빈 배열이면 빈 페이지 반환
  if (!questions || questions.length === 0) {
    return []
  }

  const pageBreak = config.pageBreak || { mode: 'smart', unit: 'passage' }
  const mode: PageBreakMode = pageBreak.mode || 'smart'
  const unit: PageBreakUnit = pageBreak.unit || 'passage'
  const minSpaceThreshold = pageBreak.minSpaceThreshold || 50

  // A4 세로 기준 대략적인 최대 높이 (여백 제외)
  const maxHeightPerPage = 1000

  // 모드에 따라 분할
  switch (mode) {
    case 'flow':
      return paginateByFlow(questions, maxHeightPerPage)
    case 'smart':
      return paginateBySmart(questions, unit, minSpaceThreshold, maxHeightPerPage)
    default:
      return paginateByFlow(questions, maxHeightPerPage)
  }
}

/**
 * 전체 페이지 수 계산
 */
export function getTotalPages(
  questions: Array<{ id: string; [key: string]: unknown }>,
  config: OutputConfig
): number {
  return paginateQuestions(questions, config).length
}




