'use client'

import { useState, useEffect, useCallback } from 'react'
import type { DataTypeFormData } from '@/types'

export interface DataTypeWithDeps {
  id: string
  name: string
  target: 'passage' | 'sentence'
  prompt: string | null
  output_schema: unknown
  sample_result: string | null
  has_answer: boolean
  answer_format: string | null
  has_dependency: boolean
  dependsOn: string[]
  created_at: string
  updated_at: string
}

export function useDataTypes() {
  const [dataTypes, setDataTypes] = useState<DataTypeWithDeps[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDataTypes = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/data-types')
      if (!response.ok) throw new Error('Failed to fetch data types')
      const data = await response.json()
      setDataTypes(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const createDataType = useCallback(async (formData: DataTypeFormData) => {
    try {
      const response = await fetch('/api/data-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      if (!response.ok) throw new Error('Failed to create data type')
      const newDataType = await response.json()
      setDataTypes(prev => [...prev, newDataType])
      return newDataType
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    }
  }, [])

  const updateDataType = useCallback(async (id: string, formData: Partial<DataTypeFormData>) => {
    try {
      const response = await fetch(`/api/data-types/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      if (!response.ok) throw new Error('Failed to update data type')
      const updated = await response.json()
      setDataTypes(prev => prev.map(dt => dt.id === id ? updated : dt))
      return updated
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    }
  }, [])

  const deleteDataType = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/data-types/${id}`, {
        method: 'DELETE'
      })
      if (!response.ok) throw new Error('Failed to delete data type')
      setDataTypes(prev => prev.filter(dt => dt.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    }
  }, [])

  useEffect(() => {
    fetchDataTypes()
  }, [fetchDataTypes])

  return {
    dataTypes,
    isLoading,
    error,
    fetchDataTypes,
    createDataType,
    updateDataType,
    deleteDataType
  }
}

