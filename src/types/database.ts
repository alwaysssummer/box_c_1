// Supabase Database Types
// 실제 사용 시 `npx supabase gen types typescript` 명령으로 자동 생성 권장

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
          korean_translation: string | null
          order_index: number
          sentence_split_status: 'pending' | 'processing' | 'completed' | 'failed'
          sentence_count: number
          split_model: string | null
          split_confidence: number | null
          created_at: string
        }
        Insert: {
          id?: string
          unit_id: string
          name: string
          content?: string | null
          korean_translation?: string | null
          order_index?: number
          sentence_split_status?: 'pending' | 'processing' | 'completed' | 'failed'
          sentence_count?: number
          split_model?: string | null
          split_confidence?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          unit_id?: string
          name?: string
          content?: string | null
          korean_translation?: string | null
          order_index?: number
          sentence_split_status?: 'pending' | 'processing' | 'completed' | 'failed'
          sentence_count?: number
          split_model?: string | null
          split_confidence?: number | null
          created_at?: string
        }
      }
      sentences: {
        Row: {
          id: string
          passage_id: string
          sentence_no: number
          content: string
          korean_translation: string | null
          word_count: number | null
          confidence: number
          split_method: 'regex' | 'ai' | 'manual' | 'hybrid'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          passage_id: string
          sentence_no: number
          content: string
          korean_translation?: string | null
          word_count?: number | null
          confidence?: number
          split_method?: 'regex' | 'ai' | 'manual' | 'hybrid'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          passage_id?: string
          sentence_no?: number
          content?: string
          korean_translation?: string | null
          word_count?: number | null
          confidence?: number
          split_method?: 'regex' | 'ai' | 'manual' | 'hybrid'
          created_at?: string
          updated_at?: string
        }
      }
      prompts: {
        Row: {
          id: string
          name: string
          description: string | null
          category: string
          target: 'passage' | 'sentence'
          content: string
          variables: string[]
          output_schema: string | null
          sample_input: string | null
          sample_output: string | null
          test_passage_id: string | null
          preferred_model: string
          status: 'draft' | 'testing' | 'confirmed'
          last_tested_at: string | null
          is_question_type: boolean  // 문제 유형으로 사용 여부
          question_group: 'practical' | 'selection' | 'writing' | 'analysis' | 'vocabulary'  // 문제 유형 그룹
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
          output_schema?: string | null
          sample_input?: string | null
          sample_output?: string | null
          test_passage_id?: string | null
          preferred_model?: string
          status?: 'draft' | 'testing' | 'confirmed'
          last_tested_at?: string | null
          is_question_type?: boolean
          question_group?: 'practical' | 'selection' | 'writing' | 'analysis' | 'vocabulary'
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
          output_schema?: string | null
          sample_input?: string | null
          sample_output?: string | null
          test_passage_id?: string | null
          preferred_model?: string
          status?: 'draft' | 'testing' | 'confirmed'
          last_tested_at?: string | null
          is_question_type?: boolean
          question_group?: 'practical' | 'selection' | 'writing' | 'analysis' | 'vocabulary'
          created_at?: string
          updated_at?: string
        }
      }
      prompt_test_history: {
        Row: {
          id: string
          prompt_id: string
          model: string
          input_text: string
          output_text: string | null
          success: boolean
          error_message: string | null
          response_time: number | null
          input_tokens: number | null
          output_tokens: number | null
          created_at: string
        }
        Insert: {
          id?: string
          prompt_id: string
          model: string
          input_text: string
          output_text?: string | null
          success?: boolean
          error_message?: string | null
          response_time?: number | null
          input_tokens?: number | null
          output_tokens?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          prompt_id?: string
          model?: string
          input_text?: string
          output_text?: string | null
          success?: boolean
          error_message?: string | null
          response_time?: number | null
          input_tokens?: number | null
          output_tokens?: number | null
          created_at?: string
        }
      }
      data_types: {
        Row: {
          id: string
          name: string
          target: 'passage' | 'sentence'
          prompt_id: string | null
          prompt: string | null
          output_schema: Json | null
          sample_result: string | null
          has_answer: boolean
          answer_format: string | null
          has_dependency: boolean
          difficulty: 'simple' | 'medium' | 'complex'
          recommended_model: string
          category: 'base' | 'analysis' | 'transform' | 'question'
          config: Json
          output_slots: string[]  // 출제 2단계: 이 데이터 유형이 생성하는 슬롯명 목록
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          target?: 'passage' | 'sentence'
          prompt_id?: string | null
          prompt?: string | null
          output_schema?: Json | null
          sample_result?: string | null
          has_answer?: boolean
          answer_format?: string | null
          has_dependency?: boolean
          difficulty?: 'simple' | 'medium' | 'complex'
          recommended_model?: string
          category?: 'base' | 'analysis' | 'transform' | 'question'
          config?: Json
          output_slots?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          target?: 'passage' | 'sentence'
          prompt_id?: string | null
          prompt?: string | null
          output_schema?: Json | null
          sample_result?: string | null
          has_answer?: boolean
          answer_format?: string | null
          has_dependency?: boolean
          difficulty?: 'simple' | 'medium' | 'complex'
          recommended_model?: string
          category?: 'base' | 'analysis' | 'transform' | 'question'
          config?: Json
          output_slots?: string[]
          created_at?: string
          updated_at?: string
        }
      }
      ai_model_config: {
        Row: {
          id: string
          task_type: string
          difficulty: 'simple' | 'medium' | 'complex' | null
          preferred_model: string
          fallback_model: string | null
          cost_per_1k_tokens: number | null
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          task_type: string
          difficulty?: 'simple' | 'medium' | 'complex' | null
          preferred_model: string
          fallback_model?: string | null
          cost_per_1k_tokens?: number | null
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          task_type?: string
          difficulty?: 'simple' | 'medium' | 'complex' | null
          preferred_model?: string
          fallback_model?: string | null
          cost_per_1k_tokens?: number | null
          description?: string | null
          created_at?: string
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
      question_types: {
        Row: {
          id: string
          name: string
          description: string | null
          instruction: string | null
          purpose: 'learning' | 'assessment'
          passage_transform: Json
          output_config: Json
          extends_from: string | null
          choice_layout: string
          choice_marker: string
          required_slots: string[]  // 출제 2단계: 이 문제 유형이 필요로 하는 슬롯명 목록
          question_group: 'practical' | 'selection' | 'writing' | 'analysis' | 'vocabulary'  // 출제 2단계: 문제 유형 그룹
          prompt_id: string | null  // 프롬프트 직접 연결 (NULL이면 슬롯 기반, 값이 있으면 프롬프트 직접 생성)
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          instruction?: string | null
          purpose?: 'learning' | 'assessment'
          passage_transform?: Json
          output_config?: Json
          extends_from?: string | null
          choice_layout?: string
          choice_marker?: string
          required_slots?: string[]
          question_group?: 'practical' | 'selection' | 'writing' | 'analysis' | 'vocabulary'
          prompt_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          instruction?: string | null
          purpose?: 'learning' | 'assessment'
          passage_transform?: Json
          output_config?: Json
          extends_from?: string | null
          choice_layout?: string
          choice_marker?: string
          required_slots?: string[]
          question_group?: 'practical' | 'selection' | 'writing' | 'analysis' | 'vocabulary'
          prompt_id?: string | null
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
          config: Json
          required: boolean
        }
        Insert: {
          id?: string
          question_type_id: string
          data_type_id: string
          role?: 'body' | 'choices' | 'answer' | 'explanation'
          order_index?: number
          config?: Json
          required?: boolean
        }
        Update: {
          id?: string
          question_type_id?: string
          data_type_id?: string
          role?: 'body' | 'choices' | 'answer' | 'explanation'
          order_index?: number
          config?: Json
          required?: boolean
        }
      }
      generated_data: {
        Row: {
          id: string
          passage_id: string
          sentence_id: string | null
          data_type_id: string
          result: Json | null
          slot_data: Json | null  // 출제 2단계: 슬롯명별 파싱된 데이터
          status: 'pending' | 'processing' | 'completed' | 'failed'
          error_message: string | null
          model_used: string | null
          confidence: number | null
          response_time: number | null
          input_tokens: number | null
          output_tokens: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          passage_id: string
          sentence_id?: string | null
          data_type_id: string
          result?: Json | null
          slot_data?: Json | null
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          error_message?: string | null
          model_used?: string | null
          confidence?: number | null
          response_time?: number | null
          input_tokens?: number | null
          output_tokens?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          passage_id?: string
          sentence_id?: string | null
          data_type_id?: string
          result?: Json | null
          slot_data?: Json | null
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          error_message?: string | null
          model_used?: string | null
          confidence?: number | null
          response_time?: number | null
          input_tokens?: number | null
          output_tokens?: number | null
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
export type Sentence = Database['public']['Tables']['sentences']['Row']
export type Prompt = Database['public']['Tables']['prompts']['Row']
export type PromptTestHistory = Database['public']['Tables']['prompt_test_history']['Row']
export type DataType = Database['public']['Tables']['data_types']['Row']
export type DataTypeDependency = Database['public']['Tables']['data_type_dependencies']['Row']
export type QuestionType = Database['public']['Tables']['question_types']['Row']
export type QuestionTypeItem = Database['public']['Tables']['question_type_items']['Row']
export type GeneratedData = Database['public']['Tables']['generated_data']['Row']
export type GeneratedQuestion = Database['public']['Tables']['generated_questions']['Row']
export type AIModelConfig = Database['public']['Tables']['ai_model_config']['Row']

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

// 지문과 문장 포함
export interface PassageWithSentences extends Passage {
  sentences: Sentence[]
}

export interface UnitWithPassagesAndSentences extends Unit {
  passages: PassageWithSentences[]
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
// 확장 타입: 출력 유형 시스템
// ============================================

// 데이터 유형 카테고리
export type DataTypeCategory = 'base' | 'analysis' | 'transform' | 'question'

// 출력 유형 목적
export type OutputPurpose = 'learning' | 'assessment'

// 지문 변형 타입
export type PassageTransformType = 'none' | 'split' | 'extract' | 'delete' | 'insert'

// 정답 형식
export type AnswerFormat = 'single' | 'multiple' | 'combination' | 'text' | 'count' | 'order'

// 지문 변형 설정 인터페이스
export interface PassageTransformConfig {
  type: PassageTransformType
  split?: {
    unit: 'sentence' | 'paragraph'
    count: number
    shuffleMethod: 'random' | 'reverse' | 'custom'
  }
  extract?: {
    target: 'sentence' | 'phrase'
    criteria: 'key_sentence' | 'transition' | 'conclusion'
    positionMarkers: number
  }
  delete?: {
    target: 'word' | 'phrase' | 'connector'
    count: number
    difficulty: 'easy' | 'medium' | 'hard'
  }
  insert?: {
    type: 'binary_choice' | 'underline' | 'bracket'
    count: number
    targetType?: 'grammar' | 'vocabulary'
  }
}

// 출력 설정 인터페이스
export interface OutputConfig {
  requiresAnswer: boolean
  requiresExplanation: boolean
  answerFormat: AnswerFormat
  choiceCount?: number
  answerType?: 'number' | 'count' | 'combination' | 'text'
}

// 데이터 유형 설정 인터페이스
export interface DataTypeConfig {
  cacheable?: boolean
  reusable?: boolean
  batchable?: boolean
  [key: string]: unknown
}

// 출력 유형 별칭 (기존 QuestionType의 확장 개념)
export type OutputType = QuestionType

// 출력 유형 아이템 (기존 QuestionTypeItem의 확장)
export type OutputTypeItem = QuestionTypeItem

// 출력 유형 상세 (조인된 데이터)
export interface OutputTypeWithItems extends OutputType {
  items: (OutputTypeItem & { dataType?: DataType })[]
  parentTemplate?: OutputType | null
}

// 데이터 유형 상세 (의존성 포함)
export interface DataTypeWithDependencies extends DataType {
  dependencies: DataType[]
  dependsOn: string[]
}

