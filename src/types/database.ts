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
          instruction: string | null
          choice_layout: string
          choice_marker: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          instruction?: string | null
          choice_layout?: string
          choice_marker?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          instruction?: string | null
          choice_layout?: string
          choice_marker?: string
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
          sentence_id: string | null
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
          sentence_id?: string | null
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
          sentence_id?: string | null
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

