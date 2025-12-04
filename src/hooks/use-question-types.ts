'use client'

import { useState, useEffect, useCallback } from 'react'
import type { QuestionTypeFormData, QuestionTypeDataItem } from '@/types'

export interface QuestionTypeWithItems {
  id: string
  name: string
  instruction: string | null
  choice_layout: string
  choice_marker: string
  dataTypeList: QuestionTypeDataItem[]
  created_at: string
  updated_at: string
}

export function useQuestionTypes() {
  const [questionTypes, setQuestionTypes] = useState<QuestionTypeWithItems[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchQuestionTypes = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/question-types')
      if (!response.ok) throw new Error('Failed to fetch question types')
      const data = await response.json()
      setQuestionTypes(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const createQuestionType = useCallback(async (formData: QuestionTypeFormData) => {
    try {
      const response = await fetch('/api/question-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      if (!response.ok) throw new Error('Failed to create question type')
      const newQuestionType = await response.json()
      setQuestionTypes(prev => [...prev, newQuestionType])
      return newQuestionType
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    }
  }, [])

  const updateQuestionType = useCallback(async (id: string, formData: Partial<QuestionTypeFormData>) => {
    try {
      const response = await fetch(`/api/question-types/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      if (!response.ok) throw new Error('Failed to update question type')
      const updated = await response.json()
      setQuestionTypes(prev => prev.map(qt => qt.id === id ? updated : qt))
      return updated
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    }
  }, [])

  const deleteQuestionType = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/question-types/${id}`, {
        method: 'DELETE'
      })
      if (!response.ok) throw new Error('Failed to delete question type')
      setQuestionTypes(prev => prev.filter(qt => qt.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    }
  }, [])

  useEffect(() => {
    fetchQuestionTypes()
  }, [fetchQuestionTypes])

  return {
    questionTypes,
    isLoading,
    error,
    fetchQuestionTypes,
    createQuestionType,
    updateQuestionType,
    deleteQuestionType
  }
}

