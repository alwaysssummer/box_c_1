/**
 * 트리 구조 관련 유틸리티 함수
 */

import type { TreeNode, GroupWithTextbooks } from '@/types'

/**
 * 그룹 데이터를 트리 노드 형식으로 변환합니다.
 * @param groups - 그룹 목록 (교재, 단원, 지문 포함)
 * @returns 트리 노드 배열
 */
export function convertToTreeNodes(groups: GroupWithTextbooks[]): TreeNode[] {
  return groups.map((group) => ({
    id: group.id,
    name: group.name,
    type: 'group' as const,
    children: group.textbooks?.map((textbook) => ({
      id: textbook.id,
      name: textbook.name,
      type: 'textbook' as const,
      children: textbook.units?.map((unit) => ({
        id: unit.id,
        name: unit.name,
        type: 'unit' as const,
        children: unit.passages?.map((passage) => ({
          id: passage.id,
          name: passage.name,
          type: 'passage' as const,
          children: [],
        })) || [],
      })) || [],
    })) || [],
  }))
}

/**
 * 트리에서 특정 노드를 ID로 찾습니다.
 * @param nodes - 트리 노드 배열
 * @param id - 찾을 노드 ID
 * @returns 찾은 노드 또는 undefined
 */
export function findNodeById(nodes: TreeNode[], id: string): TreeNode | undefined {
  for (const node of nodes) {
    if (node.id === id) return node
    if (node.children) {
      const found = findNodeById(node.children, id)
      if (found) return found
    }
  }
  return undefined
}

/**
 * 트리에서 특정 타입의 모든 노드를 찾습니다.
 * @param nodes - 트리 노드 배열
 * @param type - 노드 타입
 * @returns 해당 타입의 노드 배열
 */
export function findNodesByType(nodes: TreeNode[], type: TreeNode['type']): TreeNode[] {
  const result: TreeNode[] = []
  
  for (const node of nodes) {
    if (node.type === type) result.push(node)
    if (node.children) {
      result.push(...findNodesByType(node.children, type))
    }
  }
  
  return result
}











