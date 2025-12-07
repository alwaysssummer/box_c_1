'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Prompt } from '@/types/database'

export interface PromptFormData {
  name: string
  category: string
  content: string
  variables: string[]
  testPassageId: string | null
  preferredModel: string
  status: 'active' | 'draft' | 'archived'
}

export function usePrompts() {
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPrompts = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/prompts')
      if (!response.ok) throw new Error('Failed to fetch prompts')
      const data = await response.json()
      setPrompts(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const createPrompt = useCallback(async (formData: PromptFormData) => {
    try {
      const response = await fetch('/api/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      if (!response.ok) throw new Error('Failed to create prompt')
      const newPrompt = await response.json()
      setPrompts(prev => [...prev, newPrompt])
      return newPrompt
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    }
  }, [])

  const updatePrompt = useCallback(async (id: string, formData: Partial<PromptFormData>) => {
    try {
      const response = await fetch(`/api/prompts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      if (!response.ok) throw new Error('Failed to update prompt')
      const updated = await response.json()
      setPrompts(prev => prev.map(p => p.id === id ? updated : p))
      return updated
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    }
  }, [])

  const deletePrompt = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/prompts/${id}`, {
        method: 'DELETE'
      })
      if (!response.ok) throw new Error('Failed to delete prompt')
      setPrompts(prev => prev.filter(p => p.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    }
  }, [])

  useEffect(() => {
    fetchPrompts()
  }, [fetchPrompts])

  return {
    prompts,
    isLoading,
    error,
    fetchPrompts,
    createPrompt,
    updatePrompt,
    deletePrompt
  }
}











