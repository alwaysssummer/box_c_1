'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Group, GroupWithTextbooks } from '@/types'

export function useGroups() {
  const [groups, setGroups] = useState<GroupWithTextbooks[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchGroups = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/groups')
      if (!response.ok) throw new Error('Failed to fetch groups')
      const data = await response.json()
      setGroups(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const createGroup = useCallback(async (name: string) => {
    try {
      const response = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      })
      if (!response.ok) throw new Error('Failed to create group')
      const newGroup = await response.json()
      setGroups(prev => [...prev, { ...newGroup, textbooks: [] }])
      return newGroup
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    }
  }, [])

  const deleteGroup = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/groups/${id}`, {
        method: 'DELETE'
      })
      if (!response.ok) throw new Error('Failed to delete group')
      setGroups(prev => prev.filter(g => g.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    }
  }, [])

  const updateGroup = useCallback(async (id: string, name: string) => {
    try {
      const response = await fetch(`/api/groups/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      })
      if (!response.ok) throw new Error('Failed to update group')
      const updated = await response.json()
      setGroups(prev => prev.map(g => g.id === id ? { ...g, ...updated } : g))
      return updated
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    }
  }, [])

  useEffect(() => {
    fetchGroups()
  }, [fetchGroups])

  return {
    groups,
    isLoading,
    error,
    fetchGroups,
    createGroup,
    deleteGroup,
    updateGroup,
    setGroups
  }
}

