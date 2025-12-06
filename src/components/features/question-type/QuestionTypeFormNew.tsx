'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Loader2,
  Save,
  Trash2,
  Edit,
  X,
  Plus,
  FileText,
  PenTool,
  BookOpen,
  AlignLeft,
  List,
  CheckCircle,
  AlertTriangle,
  ChevronRight,
  LayoutTemplate,
  Layers,
  Eye,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { QuestionTypeItem } from './QuestionTypeList'
import type { DataTypeItem } from '../data-type/DataTypeList'

// ============================================
// 타입 정의
// ============================================

// 5개 그룹 정의
type QuestionGroup = 'practical' | 'selection' | 'writing' | 'analysis' | 'vocabulary'

// 그룹별 정보
const QUESTION_GROUPS: { 
  value: QuestionGroup
  label: string
  icon: React.ReactNode
  description: string
  unit: 'passage' | 'sentence' | 'word'
  hasAnswer: boolean
  hasExplanation: 'required' | 'optional' | 'none'
}[] = [
  { 
    value: 'practical', 
    label: '실전', 
    icon: <FileText className="w-4 h-4" />,
    description: '5지선다 문제 (제목/주제/빈칸/어법 등)',
    unit: 'passage',
    hasAnswer: true,
    hasExplanation: 'optional'
  },
  { 
    value: 'selection', 
    label: '선택/수정', 
    icon: <PenTool className="w-4 h-4" />,
    description: '양자택일, 오류수정 문제',
    unit: 'passage',
    hasAnswer: true,
    hasExplanation: 'optional'
  },
  { 
    value: 'writing', 
    label: '서술형/영작', 
    icon: <Edit className="w-4 h-4" />,
    description: '어구배열, 부분영작, 조건영작',
    unit: 'sentence',
    hasAnswer: true,
    hasExplanation: 'optional'
  },
  { 
    value: 'analysis', 
    label: '문장분석', 
    icon: <BookOpen className="w-4 h-4" />,
    description: '학습자료 (구조/내용/어휘 분석)',
    unit: 'sentence',
    hasAnswer: false,
    hasExplanation: 'none'
  },
  { 
    value: 'vocabulary', 
    label: '단어장', 
    icon: <List className="w-4 h-4" />,
    description: '단어장, 단어테스트',
    unit: 'word',
    hasAnswer: false,
    hasExplanation: 'none'
  },
]

// 실전 그룹 - 세부 유형
type PracticalSubType = 'content_set' | 'blank_set' | 'match_set' | 'order' | 'insert' | 'irrelevant' | 'grammar_choice' | 'grammar_wrong' | 'grammar_count' | 'vocab_wrong'

const PRACTICAL_SUB_TYPES: { value: PracticalSubType; label: string; isSet: boolean; count?: number }[] = [
  { value: 'content_set', label: '중심내용 세트', isSet: true, count: 4 },
  { value: 'blank_set', label: '빈칸 추론 세트', isSet: true, count: 3 },
  { value: 'match_set', label: '일치/불일치 세트', isSet: true, count: 4 },
  { value: 'order', label: '글의 순서', isSet: false },
  { value: 'insert', label: '문장 삽입', isSet: false },
  { value: 'irrelevant', label: '무관한 문장', isSet: false },
  { value: 'grammar_choice', label: '어법 양자택일', isSet: false },
  { value: 'grammar_wrong', label: '어법 틀린 것', isSet: false },
  { value: 'grammar_count', label: '어법 개수', isSet: false },
  { value: 'vocab_wrong', label: '어휘 부적절', isSet: false },
]

// 레이아웃 템플릿
type LayoutTemplate = {
  id: string
  name: string
  group: QuestionGroup
  slots: { id: string; name: string; position: string }[]
  preview: string // ASCII 미리보기
}

const LAYOUT_TEMPLATES: LayoutTemplate[] = [
  // 실전 그룹 템플릿
  {
    id: 'practical_standard',
    name: '표준 (지시문 + 본문 + 선택지)',
    group: 'practical',
    slots: [
      { id: 'instruction', name: '지시문', position: 'top' },
      { id: 'body', name: '본문', position: 'middle' },
      { id: 'choices', name: '선택지', position: 'bottom' },
    ],
    preview: '┌────────┐\n│ 지시문 │\n├────────┤\n│  본문  │\n├────────┤\n│ 선택지 │\n└────────┘',
  },
  {
    id: 'practical_with_box',
    name: '박스형 (주어진 글 + 본문 + 선택지)',
    group: 'practical',
    slots: [
      { id: 'instruction', name: '지시문', position: 'top' },
      { id: 'given', name: '주어진 글', position: 'box' },
      { id: 'body', name: '본문', position: 'middle' },
      { id: 'choices', name: '선택지', position: 'bottom' },
    ],
    preview: '┌────────┐\n│ 지시문 │\n├────────┤\n│▣주어진글│\n├────────┤\n│  본문  │\n├────────┤\n│ 선택지 │\n└────────┘',
  },
  // 문장분석 그룹 템플릿
  {
    id: 'analysis_a',
    name: '분석 A (원문 + 해석 + 어휘)',
    group: 'analysis',
    slots: [
      { id: 'original', name: '원문', position: 'top' },
      { id: 'translation', name: '해석', position: 'middle' },
      { id: 'vocabulary', name: '어휘', position: 'bottom' },
    ],
    preview: '┌────────┐\n│  원문  │\n├────────┤\n│  해석  │\n├────────┤\n│  어휘  │\n└────────┘',
  },
  {
    id: 'analysis_b',
    name: '분석 B (원문 + 문법 + 해석 + 어휘)',
    group: 'analysis',
    slots: [
      { id: 'original', name: '원문', position: 'top' },
      { id: 'grammar', name: '문법포인트', position: 'middle-1' },
      { id: 'translation', name: '해석', position: 'middle-2' },
      { id: 'vocabulary', name: '어휘', position: 'bottom' },
    ],
    preview: '┌────────┐\n│  원문  │\n├────────┤\n│ 문법PT │\n├────────┤\n│  해석  │\n├────────┤\n│  어휘  │\n└────────┘',
  },
  {
    id: 'analysis_c',
    name: '분석 C (좌우 분할: 원문|해석+어휘)',
    group: 'analysis',
    slots: [
      { id: 'original', name: '원문', position: 'left' },
      { id: 'translation', name: '해석', position: 'right-top' },
      { id: 'vocabulary', name: '어휘', position: 'right-bottom' },
    ],
    preview: '┌────┬────┐\n│    │해석│\n│원문├────┤\n│    │어휘│\n└────┴────┘',
  },
  // 서술형/영작 그룹 템플릿
  {
    id: 'writing_arrange',
    name: '어구배열 (원문 + 어구번호 + 힌트)',
    group: 'writing',
    slots: [
      { id: 'original', name: '원문(배열)', position: 'top' },
      { id: 'hints', name: '힌트', position: 'right' },
    ],
    preview: '┌────────┬───┐\n│①②③④⑤│힌트│\n└────────┴───┘',
  },
  {
    id: 'writing_partial',
    name: '부분영작 (괄호 + 힌트)',
    group: 'writing',
    slots: [
      { id: 'sentence', name: '문장(괄호)', position: 'top' },
      { id: 'hints', name: '힌트', position: 'right' },
    ],
    preview: '┌────────┬───┐\n│(  )영작│힌트│\n└────────┴───┘',
  },
  // 선택/수정 그룹 템플릿
  {
    id: 'selection_bracket',
    name: '양자택일 [A/B]',
    group: 'selection',
    slots: [
      { id: 'body', name: '본문([A/B]마커)', position: 'full' },
    ],
    preview: '┌────────────┐\n│①[A/B]②[A/B]│\n│③[A/B]...   │\n└────────────┘',
  },
  {
    id: 'selection_correction',
    name: '오류수정',
    group: 'selection',
    slots: [
      { id: 'body', name: '본문(오류포함)', position: 'full' },
    ],
    preview: '┌────────────┐\n│①문장(오류) │\n│②문장(오류) │\n│...         │\n└────────────┘',
  },
  // 단어장 그룹 템플릿
  {
    id: 'vocab_2col',
    name: '단어장 (2열)',
    group: 'vocabulary',
    slots: [
      { id: 'words', name: '단어목록', position: 'full' },
    ],
    preview: '┌─────┬─────┐\n│word1│word2│\n│word3│word4│\n└─────┴─────┘',
  },
  {
    id: 'vocab_test',
    name: '단어테스트 (빈칸)',
    group: 'vocabulary',
    slots: [
      { id: 'words', name: '단어목록(빈칸)', position: 'full' },
    ],
    preview: '┌─────┬─────┐\n│word1│____│\n│word3│____│\n└─────┴─────┘',
  },
]

// 선택지 레이아웃
type ChoiceLayout = 'vertical' | 'horizontal' | 'grid2'
const CHOICE_LAYOUTS: { value: ChoiceLayout; label: string }[] = [
  { value: 'vertical', label: '세로형' },
  { value: 'horizontal', label: '가로형' },
  { value: 'grid2', label: '2열 그리드' },
]

// 선택지 마커
type ChoiceMarker = 'circle' | 'number' | 'alpha' | 'paren'
const CHOICE_MARKERS: { value: ChoiceMarker; label: string; example: string }[] = [
  { value: 'circle', label: '원문자', example: '①②③④⑤' },
  { value: 'number', label: '숫자', example: '1. 2. 3. 4. 5.' },
  { value: 'alpha', label: '알파벳', example: 'A. B. C. D. E.' },
  { value: 'paren', label: '괄호', example: '(1) (2) (3) (4) (5)' },
]

// ============================================
// 더미 데이터 (미리보기용) - 5페이지 분량
// ============================================
type DummyLength = 'standard' | 'long' | 'veryLong'
type PreviewColumn = '1col' | '2col'

interface DummyQuestion {
  id: number
  type: DummyLength
  instruction: string
  passage: string
  choices: string[]
}

// 다양한 길이의 더미 문제 12개 (5페이지 분량)
const DUMMY_QUESTIONS: DummyQuestion[] = [
  {
    id: 1,
    type: 'standard',
    instruction: '다음 글의 제목으로 가장 적절한 것은?',
    passage: `The concept of emotional intelligence has gained significant attention in recent years. Unlike traditional measures of intelligence, emotional intelligence refers to the ability to recognize, understand, and manage our own emotions. Research has shown that individuals with high emotional intelligence tend to have better interpersonal relationships and make more thoughtful decisions. In the workplace, emotional intelligence has been linked to effective leadership and team collaboration.`,
    choices: ['The Definition of Emotional Intelligence', 'How IQ Tests Have Failed Us', 'The Role of Education', 'Why Performance Depends on IQ', 'The Decline of Skills'],
  },
  {
    id: 2,
    type: 'standard',
    instruction: '다음 글의 주제로 가장 적절한 것은?',
    passage: `Sleep plays a crucial role in memory consolidation and learning. During sleep, the brain processes and organizes information gathered throughout the day. Studies have demonstrated that adequate sleep improves cognitive function, creativity, and problem-solving abilities. Conversely, sleep deprivation can lead to decreased attention, impaired judgment, and reduced academic performance.`,
    choices: ['The importance of sleep for cognitive function', 'How to cure insomnia naturally', 'The history of sleep research', 'Why dreams occur during REM', 'Sleep disorders in adults'],
  },
  {
    id: 3,
    type: 'long',
    instruction: '다음 글의 요지로 가장 적절한 것은?',
    passage: `The relationship between technology and human creativity has been a subject of intense debate. On one hand, technological advancements have provided creators with unprecedented tools to express their ideas. Digital art, electronic music, and interactive media represent entirely new forms of creative expression that would not exist without technological innovation.

However, critics argue that our increasing reliance on technology may actually be diminishing our creative capacities. The constant stream of digital stimulation leaves little room for the boredom and daydreaming that often spark creative insights. Additionally, algorithmic recommendations can push creators toward conformity rather than originality.

Perhaps the most balanced perspective acknowledges that technology is neither inherently helpful nor harmful to creativity. Its impact depends largely on how we choose to use it.`,
    choices: ['기술이 창의성에 미치는 영향은 사용 방식에 달려있다', '기술은 창의성을 향상시킨다', '기술은 창의성을 저해한다', '알고리즘이 창의성을 결정한다', '디지털 기기 사용을 줄여야 한다'],
  },
  {
    id: 4,
    type: 'standard',
    instruction: '다음 빈칸에 들어갈 말로 가장 적절한 것은?',
    passage: `In many cultures, the act of gift-giving is not merely a transaction but a complex social ritual that ____________. The value of a gift often lies not in its monetary worth but in the thought and effort behind it. A carefully chosen gift demonstrates understanding of the recipient's preferences and strengthens social bonds.`,
    choices: ['reinforces relationships and social hierarchies', 'wastes valuable resources', 'is becoming obsolete', 'has no cultural significance', 'only benefits the giver'],
  },
  {
    id: 5,
    type: 'standard',
    instruction: '다음 글의 제목으로 가장 적절한 것은?',
    passage: `Urban green spaces provide numerous benefits to city residents. Parks and gardens improve air quality, reduce urban heat island effects, and provide habitats for wildlife. Beyond environmental benefits, these spaces offer opportunities for physical exercise, social interaction, and mental relaxation. Studies consistently show that access to green spaces correlates with improved mental health and well-being.`,
    choices: ['Benefits of Urban Green Spaces', 'How to Design City Parks', 'The History of Urban Planning', 'Wildlife in Cities', 'Mental Health Crisis Solutions'],
  },
  {
    id: 6,
    type: 'long',
    instruction: '다음 글의 주제로 가장 적절한 것은?',
    passage: `The concept of work-life balance has evolved significantly over the past few decades. Traditional models assumed a clear separation between professional and personal spheres, but this boundary has become increasingly blurred in the digital age. Remote work, constant connectivity, and the expectation of immediate responses have fundamentally altered how we experience both work and leisure.

Some researchers argue that the very notion of "balance" is problematic, suggesting instead a model of "work-life integration." This approach acknowledges that work and personal life inevitably overlap and focuses on finding harmony rather than strict separation. However, critics warn that integration can easily lead to work encroaching on personal time.

The COVID-19 pandemic accelerated these trends, forcing millions to work from home and challenging traditional workplace norms. As we move forward, organizations and individuals alike must reconsider what healthy boundaries look like in an interconnected world.`,
    choices: ['The evolution and challenges of work-life balance', 'Benefits of remote work', 'History of labor movements', 'How to manage stress', 'Technology in the workplace'],
  },
  {
    id: 7,
    type: 'standard',
    instruction: '다음 글의 요지로 가장 적절한 것은?',
    passage: `Language shapes the way we think and perceive the world around us. Different languages categorize colors, time, and spatial relationships in unique ways, which can influence cognitive processes. For example, speakers of languages with many words for blue may distinguish between shades of blue more easily than speakers of languages with fewer color terms.`,
    choices: ['언어는 우리의 사고와 인식에 영향을 미친다', '모든 언어는 동일한 색상 체계를 가진다', '언어 학습은 어렵다', '영어가 가장 정확한 언어이다', '색상 인식은 타고난다'],
  },
  {
    id: 8,
    type: 'veryLong',
    instruction: '다음 글의 제목으로 가장 적절한 것은?',
    passage: `The emergence of artificial intelligence has sparked a fundamental reconsideration of what it means to be human. This philosophical inquiry extends beyond mere academic curiosity; it has profound implications for how we structure our societies and envision our collective future.

Historically, humans have defined themselves in opposition to other entities. Each technological revolution has prompted a reassessment of human uniqueness. The industrial revolution challenged the notion that physical labor was distinctively human. Now, artificial intelligence threatens domains previously considered exclusively human: creativity, emotional understanding, and complex decision-making.

Some theorists argue that this progression reveals a fundamental truth: perhaps there is nothing truly unique about human cognition. According to this view, as machines become capable of increasingly sophisticated behaviors, the boundary between human and artificial intelligence will continue to blur.

Others maintain that human consciousness possesses qualities that can never be replicated by machines. They point to subjective experience, moral intuition, and the capacity for genuine understanding as fundamentally different from any process in silicon circuits.

A third perspective proposes that rather than asking whether machines can become human-like, we might consider how human-machine collaboration could create new forms of intelligence that transcend the limitations of either alone. This view sees the future as an opportunity for symbiotic evolution.

Regardless of which perspective proves most accurate, these questions are reshaping fields from philosophy to law. As AI systems become prevalent in daily life, from healthcare to criminal justice, understanding machine intelligence becomes pressing.`,
    choices: ['AI and the Philosophical Question of Human Identity', 'Why Machines Will Replace Humans', 'History of Technology', 'Legal Issues in AI', 'Industrial Revolution Impact'],
  },
  {
    id: 9,
    type: 'standard',
    instruction: '다음 빈칸에 들어갈 말로 가장 적절한 것은?',
    passage: `Effective communication is not just about speaking clearly; it also requires ____________. Understanding non-verbal cues, cultural contexts, and emotional undertones can be just as important as the words themselves. The best communicators are those who can both express their ideas clearly and interpret the responses of their audience.`,
    choices: ['active listening and observation', 'speaking loudly', 'using complex vocabulary', 'avoiding eye contact', 'talking more than listening'],
  },
  {
    id: 10,
    type: 'standard',
    instruction: '다음 글의 주제로 가장 적절한 것은?',
    passage: `The placebo effect demonstrates the powerful connection between mind and body in healing. When patients believe they are receiving effective treatment, their bodies often respond positively, even when the "treatment" has no active medical ingredients. This phenomenon has led researchers to explore how expectations and beliefs influence physical health outcomes.`,
    choices: ['The mind-body connection in healing', 'How to create fake medicines', 'Medical ethics concerns', 'History of pharmacology', 'Why doctors lie to patients'],
  },
  {
    id: 11,
    type: 'long',
    instruction: '다음 글의 요지로 가장 적절한 것은?',
    passage: `Biodiversity loss represents one of the most pressing environmental challenges of our time. Species are disappearing at rates estimated to be 100 to 1,000 times higher than natural background extinction rates. This decline threatens not only individual species but entire ecosystems and the services they provide to humanity.

Ecosystems with high biodiversity tend to be more resilient and productive. They provide essential services such as pollination, water purification, climate regulation, and soil fertility. When species disappear, these services can be compromised, often with cascading effects throughout the ecosystem.

Conservation efforts must address multiple drivers of biodiversity loss, including habitat destruction, climate change, pollution, and overexploitation. International cooperation, local community involvement, and sustainable economic practices are all essential components of effective conservation strategies.`,
    choices: ['생물다양성 손실의 심각성과 보전의 필요성', '멸종은 자연스러운 현상이다', '기후변화만이 문제다', '국제협력은 불가능하다', '경제발전이 우선이다'],
  },
  {
    id: 12,
    type: 'standard',
    instruction: '다음 글의 제목으로 가장 적절한 것은?',
    passage: `Habits are powerful drivers of human behavior, often operating below the level of conscious awareness. Once established, habits can be remarkably persistent, continuing even when they no longer serve our interests. Understanding the neurological basis of habit formation can help us develop strategies for building positive habits and breaking negative ones.`,
    choices: ['The Science of Habit Formation', 'How to Stop All Bad Habits', 'Brain Surgery Techniques', 'The History of Psychology', 'Why Change Is Impossible'],
  },
]

// 기존 단일 미리보기용 데이터 (호환성 유지)
const DUMMY_PASSAGES: Record<DummyLength, {
  label: string
  wordCount: string
  passage: string
  choices: string[]
}> = {
  standard: {
    label: '표준',
    wordCount: '~180 words',
    passage: DUMMY_QUESTIONS[0].passage,
    choices: DUMMY_QUESTIONS[0].choices,
  },
  long: {
    label: '긴 지문',
    wordCount: '~280 words',
    passage: DUMMY_QUESTIONS[2].passage,
    choices: DUMMY_QUESTIONS[2].choices,
  },
  veryLong: {
    label: '장문',
    wordCount: '~400 words',
    passage: DUMMY_QUESTIONS[7].passage,
    choices: DUMMY_QUESTIONS[7].choices,
  },
}

// 폼 데이터
// 출제 방식
type GenerationMode = 'prompt_direct' | 'slot_based'

interface QuestionTypeFormData {
  id: string | null
  name: string
  group: QuestionGroup
  subType?: PracticalSubType
  instruction: string
  layoutTemplateId: string
  slotMapping: { slotId: string; dataTypeId: string; dataTypeName: string }[]
  hasAnswer: boolean
  hasExplanation: boolean
  choiceLayout: ChoiceLayout
  choiceMarker: ChoiceMarker
  isSet: boolean
  setCount: number
  // 출제 방식 관련
  generationMode: GenerationMode  // 'prompt_direct' | 'slot_based'
  promptId: string | null  // 프롬프트 직접 생성 시 사용할 프롬프트 ID
}

interface PromptItem {
  id: string
  name: string
  category: string
}

interface QuestionTypeFormNewProps {
  questionType: QuestionTypeItem | null
  allDataTypes: DataTypeItem[]
  allPrompts: PromptItem[]  // 프롬프트 목록 추가
  isEditing: boolean
  onSave: (data: QuestionTypeFormData) => Promise<void>
  onDelete: () => Promise<void>
  onEdit: () => void
  onCancel: () => void
}

const initialFormData: QuestionTypeFormData = {
  id: null,
  name: '',
  group: 'practical',
  instruction: '',
  layoutTemplateId: 'practical_standard',
  slotMapping: [],
  hasAnswer: true,
  hasExplanation: false,
  choiceLayout: 'vertical',
  choiceMarker: 'circle',
  isSet: false,
  setCount: 1,
  generationMode: 'slot_based',  // 기본값: 슬롯 기반
  promptId: null,
}

// ============================================
// 메인 컴포넌트
// ============================================

export function QuestionTypeFormNew({
  questionType,
  allDataTypes,
  allPrompts,
  isEditing,
  onSave,
  onDelete,
  onEdit,
  onCancel,
}: QuestionTypeFormNewProps) {
  const [formData, setFormData] = useState<QuestionTypeFormData>(initialFormData)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDataTypeSelector, setShowDataTypeSelector] = useState(false)
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null)
  
  // 미리보기 상태
  const [showPreview, setShowPreview] = useState(false)
  const [previewLength, setPreviewLength] = useState<DummyLength>('standard')
  const [previewColumn, setPreviewColumn] = useState<PreviewColumn>('2col')

  // 현재 그룹 정보
  const currentGroup = QUESTION_GROUPS.find(g => g.value === formData.group)
  
  // 현재 그룹의 템플릿들
  const groupTemplates = LAYOUT_TEMPLATES.filter(t => t.group === formData.group)
  
  // 현재 선택된 템플릿
  const currentTemplate = LAYOUT_TEMPLATES.find(t => t.id === formData.layoutTemplateId)

  useEffect(() => {
    if (questionType) {
      // 기존 데이터 로드 (변환 로직 필요)
      setFormData({
        id: questionType.id,
        name: questionType.name,
        group: (questionType.question_group as QuestionGroup) || 'practical',
        instruction: questionType.instruction || '',
        layoutTemplateId: 'practical_standard',
        slotMapping: questionType.dataTypeList.map(item => ({
          slotId: item.role,
          dataTypeId: item.dataTypeId,
          dataTypeName: item.dataTypeName,
        })),
        hasAnswer: true,
        hasExplanation: false,
        choiceLayout: (questionType.choice_layout as ChoiceLayout) || 'vertical',
        choiceMarker: (questionType.choice_marker as ChoiceMarker) || 'circle',
        isSet: false,
        setCount: 1,
        generationMode: questionType.prompt_id ? 'prompt_direct' : 'slot_based',
        promptId: questionType.prompt_id || null,
      })
    } else {
      setFormData(initialFormData)
    }
  }, [questionType])

  // 그룹 변경 시 기본값 설정
  const handleGroupChange = (group: QuestionGroup) => {
    const groupInfo = QUESTION_GROUPS.find(g => g.value === group)
    const firstTemplate = LAYOUT_TEMPLATES.find(t => t.group === group)
    
    setFormData(prev => ({
      ...prev,
      group,
      layoutTemplateId: firstTemplate?.id || '',
      hasAnswer: groupInfo?.hasAnswer ?? true,
      hasExplanation: groupInfo?.hasExplanation === 'required',
      slotMapping: [],
    }))
  }

  // 템플릿 변경 시 슬롯 매핑 초기화
  const handleTemplateChange = (templateId: string) => {
    setFormData(prev => ({
      ...prev,
      layoutTemplateId: templateId,
      slotMapping: [],
    }))
  }

  // 슬롯에 데이터 유형 매핑
  const handleSlotMapping = (slotId: string, dataType: DataTypeItem) => {
    setFormData(prev => ({
      ...prev,
      slotMapping: [
        ...prev.slotMapping.filter(m => m.slotId !== slotId),
        { slotId, dataTypeId: dataType.id, dataTypeName: dataType.name },
      ],
    }))
    setShowDataTypeSelector(false)
    setSelectedSlotId(null)
  }

  // 슬롯 매핑 제거
  const handleRemoveSlotMapping = (slotId: string) => {
    setFormData(prev => ({
      ...prev,
      slotMapping: prev.slotMapping.filter(m => m.slotId !== slotId),
    }))
  }

  const handleSave = async () => {
    if (!formData.name.trim() || isSaving) return
    setIsSaving(true)
    try {
      await onSave(formData)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (isDeleting) return
    if (confirm(`"${formData.name}" 문제 유형을 삭제하시겠습니까?`)) {
      setIsDeleting(true)
      try {
        await onDelete()
      } finally {
        setIsDeleting(false)
      }
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* 상단: 그룹 선택 탭 */}
      <div className="border-b bg-muted/30 px-4 py-2">
        <div className="flex gap-1">
          {QUESTION_GROUPS.map((group) => (
            <Button
              key={group.value}
              variant={formData.group === group.value ? 'default' : 'ghost'}
              size="sm"
              onClick={() => isEditing && handleGroupChange(group.value)}
              disabled={!isEditing}
              className={cn(
                'flex items-center gap-1.5',
                formData.group === group.value && 'bg-primary text-primary-foreground'
              )}
            >
              {group.icon}
              <span>{group.label}</span>
            </Button>
          ))}
        </div>
        {currentGroup && (
          <p className="text-xs text-muted-foreground mt-1">
            {currentGroup.description} • 단위: {currentGroup.unit === 'passage' ? '지문' : currentGroup.unit === 'sentence' ? '문장' : '단어'}
          </p>
        )}
      </div>

      <div className="flex-1 flex gap-4 p-4 overflow-hidden">
        {/* 좌측: 기본 정보 + 속성 */}
        <div className="w-72 flex flex-col gap-4 overflow-auto">
          {/* 기본 정보 */}
          <div className="border rounded-lg p-3 bg-white">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Layers className="w-4 h-4" />
              기본 정보
            </h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  유형명 *
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  disabled={!isEditing}
                  placeholder="예: 제목 추론"
                  className="h-8 text-sm"
                />
              </div>

              {formData.group === 'practical' && (
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    세부 유형
                  </label>
                  <Select
                    value={formData.subType}
                    onValueChange={(v) => {
                      const subType = v as PracticalSubType
                      const subTypeInfo = PRACTICAL_SUB_TYPES.find(s => s.value === subType)
                      setFormData(prev => ({
                        ...prev,
                        subType,
                        isSet: subTypeInfo?.isSet ?? false,
                        setCount: subTypeInfo?.count ?? 1,
                      }))
                    }}
                    disabled={!isEditing}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="선택..." />
                    </SelectTrigger>
                    <SelectContent>
                      {PRACTICAL_SUB_TYPES.map((sub) => (
                        <SelectItem key={sub.value} value={sub.value}>
                          <div className="flex items-center gap-2">
                            {sub.label}
                            {sub.isSet && (
                              <Badge variant="outline" className="text-xs">
                                {sub.count}문제
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  지시문
                </label>
                <Textarea
                  value={formData.instruction}
                  onChange={(e) => setFormData(prev => ({ ...prev, instruction: e.target.value }))}
                  disabled={!isEditing}
                  placeholder="예: 다음 글의 제목으로..."
                  className="text-sm min-h-[60px] resize-none"
                />
              </div>
            </div>
          </div>

          {/* 출제 방식 선택 */}
          <div className="border rounded-lg p-3 bg-white">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              출제 방식
            </h3>
            <div className="space-y-3">
              {/* 방식 선택 */}
              <div className="flex gap-2">
                <Button
                  variant={formData.generationMode === 'prompt_direct' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => isEditing && setFormData(prev => ({ ...prev, generationMode: 'prompt_direct' }))}
                  disabled={!isEditing}
                  className="flex-1 text-xs"
                >
                  프롬프트 직접
                </Button>
                <Button
                  variant={formData.generationMode === 'slot_based' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => isEditing && setFormData(prev => ({ ...prev, generationMode: 'slot_based', promptId: null }))}
                  disabled={!isEditing}
                  className="flex-1 text-xs"
                >
                  슬롯 기반
                </Button>
              </div>
              
              {/* 프롬프트 직접 선택 시 */}
              {formData.generationMode === 'prompt_direct' && (
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    프롬프트 선택 *
                  </label>
                  <Select
                    value={formData.promptId || ''}
                    onValueChange={(v) => setFormData(prev => ({ ...prev, promptId: v || null }))}
                    disabled={!isEditing}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="프롬프트 선택..." />
                    </SelectTrigger>
                    <SelectContent>
                      {allPrompts.map((prompt) => (
                        <SelectItem key={prompt.id} value={prompt.id}>
                          <div className="flex items-center gap-2">
                            <span>{prompt.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {prompt.category}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    프롬프트가 완성된 문제를 직접 생성합니다.
                  </p>
                </div>
              )}
              
              {/* 슬롯 기반 선택 시 */}
              {formData.generationMode === 'slot_based' && (
                <p className="text-xs text-muted-foreground">
                  사전데이터를 검증 후 슬롯 조합으로 문제를 생성합니다.
                </p>
              )}
            </div>
          </div>

          {/* 정답/해설 설정 */}
          <div className="border rounded-lg p-3 bg-white">
            <h3 className="text-sm font-semibold mb-3">정답/해설</h3>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={formData.hasAnswer}
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({ ...prev, hasAnswer: checked as boolean }))
                  }
                  disabled={!isEditing || currentGroup?.hasAnswer === false}
                />
                <span className="text-sm">정답 필요</span>
                {currentGroup?.hasAnswer === false && (
                  <Badge variant="secondary" className="text-xs">학습자료</Badge>
                )}
              </label>
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={formData.hasExplanation}
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({ ...prev, hasExplanation: checked as boolean }))
                  }
                  disabled={!isEditing || currentGroup?.hasExplanation === 'none'}
                />
                <span className="text-sm">해설 포함</span>
              </label>
            </div>
          </div>

          {/* 선택지 설정 (실전 그룹만) */}
          {formData.group === 'practical' && (
            <div className="border rounded-lg p-3 bg-white">
              <h3 className="text-sm font-semibold mb-3">선택지 설정</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    배열
                  </label>
                  <div className="flex gap-1">
                    {CHOICE_LAYOUTS.map((layout) => (
                      <Button
                        key={layout.value}
                        variant={formData.choiceLayout === layout.value ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFormData(prev => ({ ...prev, choiceLayout: layout.value }))}
                        disabled={!isEditing}
                        className="flex-1 text-xs"
                      >
                        {layout.label}
                      </Button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    번호
                  </label>
                  <div className="grid grid-cols-2 gap-1">
                    {CHOICE_MARKERS.map((marker) => (
                      <Button
                        key={marker.value}
                        variant={formData.choiceMarker === marker.value ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFormData(prev => ({ ...prev, choiceMarker: marker.value }))}
                        disabled={!isEditing}
                        className="text-xs"
                      >
                        {marker.example}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 액션 버튼 */}
          <div className="flex gap-2 mt-auto">
            {isEditing ? (
              <>
                <Button
                  onClick={handleSave}
                  disabled={!formData.name.trim() || isSaving}
                  className="flex-1"
                  size="sm"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
                  저장
                </Button>
                <Button onClick={onCancel} variant="outline" className="flex-1" size="sm">
                  취소
                </Button>
              </>
            ) : (
              <>
                <Button onClick={onEdit} className="flex-1" size="sm">
                  <Edit className="w-4 h-4 mr-1" />
                  수정
                </Button>
                <Button onClick={handleDelete} variant="destructive" className="flex-1" size="sm" disabled={isDeleting}>
                  {isDeleting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Trash2 className="w-4 h-4 mr-1" />}
                  삭제
                </Button>
              </>
            )}
          </div>
        </div>

        {/* 중앙: 레이아웃 템플릿 선택 + 캔버스 */}
        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
          {/* 템플릿 선택 */}
          <div className="border rounded-lg p-3 bg-white">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <LayoutTemplate className="w-4 h-4" />
              레이아웃 템플릿
            </h3>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {groupTemplates.map((template) => (
                <Button
                  key={template.id}
                  variant={formData.layoutTemplateId === template.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => isEditing && handleTemplateChange(template.id)}
                  disabled={!isEditing}
                  className="flex-shrink-0 h-auto py-2 px-3"
                >
                  <div className="text-left">
                    <div className="text-xs font-medium">{template.name}</div>
                    <pre className="text-[10px] mt-1 font-mono opacity-70 whitespace-pre">
                      {template.preview}
                    </pre>
                  </div>
                </Button>
              ))}
            </div>
          </div>

          {/* A4 캔버스 미리보기 */}
          <div className="flex-1 border-2 border-border rounded-lg bg-white p-4 overflow-auto">
            <div className="text-xs text-muted-foreground mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-3 h-3" />
                미리보기 (A4)
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(true)}
                className="h-7 text-xs gap-1"
              >
                <Eye className="w-3 h-3" />
                샘플 미리보기
              </Button>
            </div>
            
            {currentTemplate ? (
              <div className="space-y-3">
                {/* 지시문 */}
                {formData.instruction && (
                  <div className="border border-dashed border-border rounded p-2 bg-muted/20">
                    <span className="text-xs text-muted-foreground">지시문: </span>
                    <span className="text-sm">{formData.instruction}</span>
                  </div>
                )}

                {/* 슬롯들 */}
                {currentTemplate.slots.map((slot) => {
                  const mapping = formData.slotMapping.find(m => m.slotId === slot.id)
                  
                  return (
                    <div
                      key={slot.id}
                      className={cn(
                        'border-2 border-dashed rounded-lg p-4 transition-all',
                        mapping 
                          ? 'border-primary/50 bg-primary/5' 
                          : 'border-border hover:border-primary/30',
                        isEditing && 'cursor-pointer hover:bg-muted/50'
                      )}
                      onClick={() => {
                        if (isEditing) {
                          setSelectedSlotId(slot.id)
                          setShowDataTypeSelector(true)
                        }
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant={mapping ? 'default' : 'outline'} className="text-xs">
                            {slot.name}
                          </Badge>
                          {mapping && (
                            <>
                              <ChevronRight className="w-3 h-3 text-muted-foreground" />
                              <span className="text-sm font-medium text-primary">
                                {mapping.dataTypeName}
                              </span>
                              <CheckCircle className="w-3 h-3 text-green-500" />
                            </>
                          )}
                        </div>
                        {mapping && isEditing && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleRemoveSlotMapping(slot.id)
                            }}
                            className="h-6 w-6 p-0 text-destructive"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                      {!mapping && (
                        <p className="text-xs text-muted-foreground mt-2">
                          {isEditing ? '클릭하여 데이터 유형 선택' : '데이터 유형 미설정'}
                        </p>
                      )}
                    </div>
                  )
                })}

                {/* 선택지 미리보기 (실전 그룹) */}
                {formData.group === 'practical' && (
                  <div className="border border-border rounded-lg p-3 bg-muted/20">
                    <span className="text-xs text-muted-foreground block mb-2">선택지</span>
                    <div className={cn(
                      'gap-2',
                      formData.choiceLayout === 'vertical' && 'flex flex-col',
                      formData.choiceLayout === 'horizontal' && 'flex flex-wrap',
                      formData.choiceLayout === 'grid2' && 'grid grid-cols-2',
                    )}>
                      {[1, 2, 3, 4, 5].map((n) => {
                        const markers = {
                          circle: ['①', '②', '③', '④', '⑤'],
                          number: ['1.', '2.', '3.', '4.', '5.'],
                          alpha: ['A.', 'B.', 'C.', 'D.', 'E.'],
                          paren: ['(1)', '(2)', '(3)', '(4)', '(5)'],
                        }
                        return (
                          <div key={n} className="text-sm text-muted-foreground">
                            {markers[formData.choiceMarker][n - 1]} 선택지 {n}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                레이아웃 템플릿을 선택하세요
              </div>
            )}
          </div>
        </div>

        {/* 우측: 출력물 구성 요약 */}
        <div className="w-48 flex flex-col gap-3">
          <div className="border rounded-lg p-3 bg-white">
            <h3 className="text-sm font-semibold mb-2">출력물 구성</h3>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <CheckCircle className={cn('w-3 h-3', formData.hasAnswer ? 'text-green-500' : 'text-muted-foreground')} />
                <span>문제지</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className={cn('w-3 h-3', formData.hasAnswer ? 'text-green-500' : 'text-muted-foreground')} />
                <span>정답지</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className={cn('w-3 h-3', formData.hasExplanation ? 'text-green-500' : 'text-muted-foreground')} />
                <span>해설지</span>
              </div>
            </div>
          </div>

          {/* 매핑된 데이터 유형 목록 */}
          <div className="border rounded-lg p-3 bg-white flex-1">
            <h3 className="text-sm font-semibold mb-2">연결된 데이터</h3>
            {formData.slotMapping.length === 0 ? (
              <p className="text-xs text-muted-foreground">없음</p>
            ) : (
              <div className="space-y-1">
                {formData.slotMapping.map((mapping) => (
                  <Badge key={mapping.slotId} variant="secondary" className="text-xs block">
                    {mapping.dataTypeName}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* 세트 정보 */}
          {formData.isSet && (
            <div className="border rounded-lg p-3 bg-amber-50 border-amber-200">
              <h3 className="text-sm font-semibold mb-1 text-amber-700">세트 문제</h3>
              <p className="text-xs text-amber-600">
                1지문 → {formData.setCount}문제
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 데이터 유형 선택 다이얼로그 */}
      <Dialog open={showDataTypeSelector} onOpenChange={setShowDataTypeSelector}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              데이터 유형 선택
              {selectedSlotId && currentTemplate && (
                <Badge variant="outline" className="ml-2">
                  {currentTemplate.slots.find(s => s.id === selectedSlotId)?.name}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2 max-h-96 overflow-auto py-4">
            {allDataTypes.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4 col-span-2">
                등록된 데이터 유형이 없습니다
              </p>
            ) : (
              allDataTypes.map((dt) => (
                <Button
                  key={dt.id}
                  variant="outline"
                  className="justify-start h-auto py-2"
                  onClick={() => selectedSlotId && handleSlotMapping(selectedSlotId, dt)}
                >
                  <div className="text-left">
                    <div className="text-sm font-medium">{dt.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {dt.target === 'passage' ? '지문' : '문장'} • {dt.has_answer ? '정답有' : '자료형'}
                    </div>
                  </div>
                </Button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 샘플 미리보기 다이얼로그 (A4 페이지 구분) */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="sm:max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center justify-between flex-wrap gap-2">
              <span>📄 실제 출력 미리보기 (12문제)</span>
              <div className="flex gap-2">
                {/* 레이아웃 선택 */}
                <div className="flex gap-1 border rounded-lg p-1">
                  <Button
                    variant={previewColumn === '1col' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setPreviewColumn('1col')}
                    className="text-xs h-7"
                  >
                    1단
                  </Button>
                  <Button
                    variant={previewColumn === '2col' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setPreviewColumn('2col')}
                    className="text-xs h-7"
                  >
                    2단
                  </Button>
                </div>
              </div>
            </DialogTitle>
          </DialogHeader>
          
          {/* 스크롤 가능한 미리보기 영역 */}
          <div className="flex-1 overflow-auto bg-gray-200 p-4">
            {/* A4 페이지들 - 각 페이지는 정확한 A4 비율 유지 */}
            <div className="space-y-8">
              {(() => {
                // A4 페이지 설정 (고정 비율)
                const A4_WIDTH_PX = 794  // 210mm at 96dpi
                const A4_HEIGHT_PX = 1123 // 297mm at 96dpi
                const PADDING_PX = 56    // 약 15mm 여백
                const CONTENT_HEIGHT = A4_HEIGHT_PX - (PADDING_PX * 2)
                
                // 문제를 페이지별로 분배 (대략적 추정)
                // 2단일 때: 페이지당 약 4-5개 문제
                // 1단일 때: 페이지당 약 2-3개 문제
                const questionsPerPage = previewColumn === '2col' ? 4 : 2
                const totalPages = Math.ceil(DUMMY_QUESTIONS.length / questionsPerPage)
                
                const markers = {
                  circle: ['①', '②', '③', '④', '⑤'],
                  number: ['1.', '2.', '3.', '4.', '5.'],
                  alpha: ['A.', 'B.', 'C.', 'D.', 'E.'],
                  paren: ['(1)', '(2)', '(3)', '(4)', '(5)'],
                }
                
                return Array.from({ length: totalPages }, (_, pageIndex) => {
                  const startIdx = pageIndex * questionsPerPage
                  const pageQuestions = DUMMY_QUESTIONS.slice(startIdx, startIdx + questionsPerPage)
                  
                  return (
                    <div 
                      key={pageIndex}
                      className="bg-white shadow-lg mx-auto relative"
                      style={{ 
                        width: `${A4_WIDTH_PX}px`,
                        minHeight: `${A4_HEIGHT_PX}px`,
                        maxWidth: '100%',
                        padding: `${PADDING_PX}px`,
                      }}
                    >
                      {/* 페이지 번호 (상단) */}
                      <div className="absolute top-2 right-4 text-xs text-gray-400">
                        Page {pageIndex + 1} / {totalPages}
                      </div>
                      
                      {/* 2단 레이아웃 컨테이너 */}
                      <div 
                        className={cn(
                          previewColumn === '2col' && 'columns-2 gap-6'
                        )}
                        style={{
                          columnRule: previewColumn === '2col' ? '1px solid #e5e7eb' : 'none',
                          minHeight: `${CONTENT_HEIGHT}px`,
                        }}
                      >
                        {pageQuestions.map((question) => {
                          const fontSize = question.type === 'veryLong' ? '9pt' : question.type === 'long' ? '9.5pt' : '10pt'
                          
                          return (
                            <div 
                              key={question.id}
                              className="mb-5 pb-3 border-b border-gray-100 last:border-b-0"
                              style={{ 
                                breakInside: 'avoid',
                                pageBreakInside: 'avoid',
                                fontSize,
                              }}
                            >
                              {/* 문제 번호 + 지시문 */}
                              <div className="mb-2">
                                <span className="font-bold">{question.id}. </span>
                                <span className="text-[10pt]">{question.instruction}</span>
                                {question.type !== 'standard' && (
                                  <Badge 
                                    variant={question.type === 'veryLong' ? 'destructive' : 'secondary'} 
                                    className="ml-2 text-[7pt] py-0 px-1"
                                  >
                                    {question.type === 'veryLong' ? '장문' : '긴'}
                                  </Badge>
                                )}
                              </div>

                              {/* 지문 */}
                              <div className="mb-2 text-justify leading-snug indent-3 whitespace-pre-wrap text-[9pt]">
                                {question.passage}
                              </div>

                              {/* 선택지 */}
                              <div className={cn(
                                'text-[9pt]',
                                formData.choiceLayout === 'vertical' && 'flex flex-col gap-0.5',
                                formData.choiceLayout === 'horizontal' && 'flex flex-wrap gap-x-3',
                                formData.choiceLayout === 'grid2' && 'grid grid-cols-2 gap-x-2',
                              )}>
                                {question.choices.map((choice, idx) => (
                                  <div key={idx} className="py-0.5 leading-tight">
                                    <span className="mr-1">{markers[formData.choiceMarker][idx]}</span>
                                    <span>{choice}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      
                      {/* 페이지 하단 여백 표시 */}
                      <div className="absolute bottom-2 left-0 right-0 text-center">
                        <span className="text-[8pt] text-gray-300">───────────────────</span>
                      </div>
                    </div>
                  )
                })
              })()}
            </div>
          </div>

          {/* 하단 정보 */}
          <div className="flex-shrink-0 flex items-center justify-between text-sm text-muted-foreground border-t pt-3 mt-3">
            <div className="flex items-center gap-4">
              <span>📊 총 문제 수: {DUMMY_QUESTIONS.length}개</span>
              <span>표준: {DUMMY_QUESTIONS.filter(q => q.type === 'standard').length}개</span>
              <span>긴 지문: {DUMMY_QUESTIONS.filter(q => q.type === 'long').length}개</span>
              <span>장문: {DUMMY_QUESTIONS.filter(q => q.type === 'veryLong').length}개</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {previewColumn === '2col' ? '2단 레이아웃' : '1단 레이아웃'}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                문제 분할 방지 적용
              </Badge>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

