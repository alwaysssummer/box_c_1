// Supabase Database Types
// 실제 사용 시 `npx supabase gen types typescript` 명령으로 자동 생성 권장

import type { OutputConfig } from './output-config'
export type { OutputConfig } from './output-config'

// ============================================
// 레이아웃 설정 타입 (4단계 위자드) - 기존 호환용
// ============================================
export interface LayoutConfig {
  // Step 3: 레이아웃
  placement_mode: 'free_flow' | 'page_fixed'
  columns: 1 | 2
  questions_per_page?: number
  choice_layout?: 'horizontal' | 'vertical'
  choice_marker?: 'number_circle' | 'alpha_circle' | 'number_dot'
  
  // Step 4: 출력 뷰
  views?: {
    student: string[]
    answer: string[]
    teacher: string[]
  }
}

// 기본 레이아웃 설정
export const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
  placement_mode: 'free_flow',
  columns: 1,
  choice_layout: 'vertical',
  choice_marker: 'number_circle',
  views: {
    student: ['passage', 'choices'],
    answer: ['choices', 'answer'],
    teacher: ['passage', 'choices', 'answer', 'explanation']
  }
}

// 블록 출력 필드 타입
export interface OutputField {
  key: string
  type?: 'text' | 'array' | 'number' | 'boolean' | 'object'  // 선택사항 (하위 호환)
  label?: string  // 표시 이름
  sample?: string | number | boolean | object
}

/**
 * OutputField 정규화 함수
 * - 기존 { key: "xxx" } 형식도 지원
 * - 새로운 { key, type, sample } 형식도 지원
 * - JSON 문자열도 파싱하여 처리 (DB에 문자열로 저장된 경우)
 */
export function normalizeOutputField(field: string | OutputField): OutputField {
  // 문자열인 경우
  if (typeof field === 'string') {
    // JSON 문자열인지 확인하고 파싱 시도
    if (field.startsWith('{') && field.includes('"key"')) {
      try {
        const parsed = JSON.parse(field)
        if (parsed && typeof parsed === 'object' && 'key' in parsed && typeof parsed.key === 'string') {
          return { 
            key: parsed.key, 
            type: parsed.type || 'text', 
            label: parsed.label,
            sample: parsed.sample 
          }
        }
      } catch {
        // JSON 파싱 실패 시 일반 문자열로 처리
      }
    }
    // 일반 문자열 (필드 이름만)
    return { key: field, type: 'text' }
  }
  
  // 객체인 경우
  let key = field.key
  let label = field.label
  
  // key가 JSON 문자열인 경우도 처리
  if (typeof key === 'string' && key.startsWith('{') && key.includes('"key"')) {
    try {
      const parsed = JSON.parse(key)
      if (parsed && typeof parsed.key === 'string') {
        key = parsed.key
        label = label || parsed.label
      }
    } catch {
      // 파싱 실패 시 원래 값 유지
    }
  }
  
  return { 
    key, 
    type: field.type || 'text',
    label,
    sample: field.sample
  }
}

/**
 * OutputField 배열 정규화
 */
export function normalizeOutputFields(fields: (string | OutputField)[] | null | undefined): OutputField[] {
  if (!fields || !Array.isArray(fields)) {
    return []
  }
  return fields.map(normalizeOutputField)
}

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      groups: {
        Row: {
          id: string
          name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
          updated_at?: string
        }
      }
      textbooks: {
        Row: {
          id: string
          group_id: string
          name: string
          google_sheet_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          group_id: string
          name: string
          google_sheet_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          group_id?: string
          name?: string
          google_sheet_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      units: {
        Row: {
          id: string
          textbook_id: string
          name: string
          order_index: number
          created_at: string
        }
        Insert: {
          id?: string
          textbook_id: string
          name: string
          order_index?: number
          created_at?: string
        }
        Update: {
          id?: string
          textbook_id?: string
          name?: string
          order_index?: number
          created_at?: string
        }
      }
      passages: {
        Row: {
          id: string
          unit_id: string
          name: string
          content: string | null
          order_index: number
          created_at: string
        }
        Insert: {
          id?: string
          unit_id: string
          name: string
          content?: string | null
          order_index?: number
          created_at?: string
        }
        Update: {
          id?: string
          unit_id?: string
          name?: string
          content?: string | null
          order_index?: number
          created_at?: string
        }
      }
      data_types: {
        Row: {
          id: string
          name: string
          target: 'passage' | 'sentence'
          prompt: string | null
          output_schema: Json | null
          sample_result: string | null
          has_answer: boolean
          answer_format: string | null
          has_dependency: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          target?: 'passage' | 'sentence'
          prompt?: string | null
          output_schema?: Json | null
          sample_result?: string | null
          has_answer?: boolean
          answer_format?: string | null
          has_dependency?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          target?: 'passage' | 'sentence'
          prompt?: string | null
          output_schema?: Json | null
          sample_result?: string | null
          has_answer?: boolean
          answer_format?: string | null
          has_dependency?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      data_type_dependencies: {
        Row: {
          id: string
          data_type_id: string
          depends_on_id: string
        }
        Insert: {
          id?: string
          data_type_id: string
          depends_on_id: string
        }
        Update: {
          id?: string
          data_type_id?: string
          depends_on_id?: string
        }
      }
      // 프롬프트 테이블
      prompts: {
        Row: {
          id: string
          name: string
          description: string | null
          category: string
          target: 'passage' | 'sentence'
          content: string
          variables: string[]
          output_schema: Json | null
          sample_input: string | null
          sample_output: string | null
          test_passage_id: string | null
          preferred_model: string
          status: 'draft' | 'testing' | 'confirmed'
          is_question_type: boolean
          question_group: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          category?: string
          target?: 'passage' | 'sentence'
          content: string
          variables?: string[]
          output_schema?: Json | null
          sample_input?: string | null
          sample_output?: string | null
          test_passage_id?: string | null
          preferred_model?: string
          status?: 'draft' | 'testing' | 'confirmed'
          is_question_type?: boolean
          question_group?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          category?: string
          target?: 'passage' | 'sentence'
          content?: string
          variables?: string[]
          output_schema?: Json | null
          sample_input?: string | null
          sample_output?: string | null
          test_passage_id?: string | null
          preferred_model?: string
          status?: 'draft' | 'testing' | 'confirmed'
          is_question_type?: boolean
          question_group?: string
          created_at?: string
          updated_at?: string
        }
      }
      // 블록 정의 테이블 (2단계 위자드)
      block_definitions: {
        Row: {
          id: string
          label: string
          type: 'single' | 'bundle'
          unit: 'passage' | 'sentence'
          prompt: string
          prompt_version: number
          output_fields: OutputField[]
          description: string | null
          is_active: boolean
          modifies_passage: boolean  // 지문 가공 여부
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          label: string
          type: 'single' | 'bundle'
          unit?: 'passage' | 'sentence'
          prompt: string
          prompt_version?: number
          output_fields?: OutputField[]
          description?: string | null
          is_active?: boolean
          modifies_passage?: boolean  // 기본값 false
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          label?: string
          type?: 'single' | 'bundle'
          unit?: 'passage' | 'sentence'
          prompt?: string
          prompt_version?: number
          output_fields?: OutputField[]
          description?: string | null
          is_active?: boolean
          modifies_passage?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      // 블록 인스턴스 테이블
      block_instances: {
        Row: {
          id: string
          block_def_id: string
          passage_id: string
          sentence_index: number
          content: Json
          status: 'pending' | 'processing' | 'completed' | 'failed'
          error_message: string | null
          generated_with_version: number | null
          model_used: string | null
          tokens_used: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          block_def_id: string
          passage_id: string
          sentence_index?: number
          content?: Json
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          error_message?: string | null
          generated_with_version?: number | null
          model_used?: string | null
          tokens_used?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          block_def_id?: string
          passage_id?: string
          sentence_index?: number
          content?: Json
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          error_message?: string | null
          generated_with_version?: number | null
          model_used?: string | null
          tokens_used?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      question_types: {
        Row: {
          id: string
          name: string
          instruction: string | null
          choice_layout: string
          choice_marker: string
          // 새로운 4단계 위자드 필드
          output_type: 'question' | 'study_material'
          description: string | null
          question_group: 'csat' | 'school_passage' | 'school_sentence' | 'study'
          required_block_ids: string[]
          layout_config: LayoutConfig
          output_config: OutputConfig | null  // 새로운 출력 설정 (v2.0)
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          instruction?: string | null
          choice_layout?: string
          choice_marker?: string
          // 새로운 4단계 위자드 필드
          output_type?: 'question' | 'study_material'
          description?: string | null
          question_group?: 'csat' | 'school_passage' | 'school_sentence' | 'study'
          required_block_ids?: string[]
          layout_config?: LayoutConfig
          output_config?: OutputConfig | null  // 새로운 출력 설정 (v2.0)
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          instruction?: string | null
          choice_layout?: string
          choice_marker?: string
          // 새로운 4단계 위자드 필드
          output_type?: 'question' | 'study_material'
          description?: string | null
          question_group?: 'csat' | 'school_passage' | 'school_sentence' | 'study'
          required_block_ids?: string[]
          layout_config?: LayoutConfig
          output_config?: OutputConfig | null  // 새로운 출력 설정 (v2.0)
          created_at?: string
          updated_at?: string
        }
      }
      question_type_items: {
        Row: {
          id: string
          question_type_id: string
          data_type_id: string
          role: 'body' | 'choices' | 'answer' | 'explanation'
          order_index: number
        }
        Insert: {
          id?: string
          question_type_id: string
          data_type_id: string
          role?: 'body' | 'choices' | 'answer' | 'explanation'
          order_index?: number
        }
        Update: {
          id?: string
          question_type_id?: string
          data_type_id?: string
          role?: 'body' | 'choices' | 'answer' | 'explanation'
          order_index?: number
        }
      }
      generated_data: {
        Row: {
          id: string
          passage_id: string
          data_type_id: string
          result: Json | null
          status: 'pending' | 'processing' | 'completed' | 'failed'
          error_message: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          passage_id: string
          data_type_id: string
          result?: Json | null
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          error_message?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          passage_id?: string
          data_type_id?: string
          result?: Json | null
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          error_message?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      generated_questions: {
        Row: {
          id: string
          passage_id: string
          question_type_id: string
          instruction: string | null
          body: string | null
          choices: Json | null
          answer: string | null
          explanation: string | null
          status: 'pending' | 'processing' | 'completed' | 'failed'
          error_message: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          passage_id: string
          question_type_id: string
          instruction?: string | null
          body?: string | null
          choices?: Json | null
          answer?: string | null
          explanation?: string | null
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          error_message?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          passage_id?: string
          question_type_id?: string
          instruction?: string | null
          body?: string | null
          choices?: Json | null
          answer?: string | null
          explanation?: string | null
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          error_message?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      // 레이아웃 즐겨찾기 테이블
      layout_favorites: {
        Row: {
          id: string
          name: string
          description: string | null
          config: OutputConfig
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          config: OutputConfig
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          config?: OutputConfig
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// 편의를 위한 타입 별칭
export type Group = Database['public']['Tables']['groups']['Row']
export type Textbook = Database['public']['Tables']['textbooks']['Row']
export type Unit = Database['public']['Tables']['units']['Row']
export type Passage = Database['public']['Tables']['passages']['Row']
export type DataType = Database['public']['Tables']['data_types']['Row']
export type DataTypeDependency = Database['public']['Tables']['data_type_dependencies']['Row']
export type Prompt = Database['public']['Tables']['prompts']['Row']
export type BlockDefinition = Database['public']['Tables']['block_definitions']['Row']
export type BlockInstance = Database['public']['Tables']['block_instances']['Row']
export type QuestionType = Database['public']['Tables']['question_types']['Row']
export type QuestionTypeItem = Database['public']['Tables']['question_type_items']['Row']
export type GeneratedData = Database['public']['Tables']['generated_data']['Row']
export type GeneratedQuestion = Database['public']['Tables']['generated_questions']['Row']
export type LayoutFavorite = Database['public']['Tables']['layout_favorites']['Row']

// 블록 정의 + 확장 타입
export interface BlockDefinitionWithInstances extends BlockDefinition {
  instances?: BlockInstance[]
}

// 문제 유형 + 블록 정의 확장 타입
export interface QuestionTypeWithBlocks extends QuestionType {
  blocks?: BlockDefinition[]
}

// 트리 구조를 위한 확장 타입
export interface TextbookWithUnits extends Textbook {
  units: UnitWithPassages[]
}

export interface UnitWithPassages extends Unit {
  passages: Passage[]
}

export interface GroupWithTextbooks extends Group {
  textbooks: TextbookWithUnits[]
}

// 트리 노드 타입
export type TreeNodeType = 'group' | 'textbook' | 'unit' | 'passage'

export interface TreeNode {
  id: string
  name: string
  type: TreeNodeType
  children?: TreeNode[]
}

// ============================================
// Status API 응답 타입
// ============================================

export interface StatusPassage {
  id: string
  name: string
  orderIndex: number
  sentenceSplitStatus: 'pending' | 'completed' | 'error'
  sentenceCount: number
  generatedData: Record<string, string>
  generatedQuestions: Record<string, string>
}

export interface StatusUnit {
  id: string
  name: string
  orderIndex: number
  passageCount: number
  passages: StatusPassage[]
}

export interface StatusTextbook {
  id: string
  name: string
  orderIndex: number
  unitCount: number
  passageCount: number
  units: StatusUnit[]
}

export interface StatusGroup {
  id: string
  name: string
  orderIndex: number
  textbookCount: number
  passageCount: number
  textbooks: StatusTextbook[]
}

export interface StatusResponse {
  summary: {
    groups: number
    textbooks: number
    units: number
    passages: number
    sentenceSplit: {
      completed: number
      pending: number
      error: number
    }
  }
  dataTypes: Array<{
    id: string
    name: string
    category: string
    stats: { total: number; completed: number; failed: number }
  }>
  questionTypes: Array<{
    id: string
    name: string
    stats: { total: number; completed: number; failed: number }
  }>
  hierarchy: StatusGroup[]
}

