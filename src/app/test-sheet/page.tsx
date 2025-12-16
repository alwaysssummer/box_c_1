'use client'

import { SheetImporter } from '@/components/features/textbook'

export default function TestSheetPage() {
  const handleRegister = async (data: {
    name: string
    units: { name: string; passages: { name: string; content?: string }[] }[]
  }) => {
    console.log('Registered:', data)
    alert(`교재 등록 완료!\n- 교재명: ${data.name}\n- 단원 수: ${data.units.length}\n- 지문 수: ${data.units.reduce((sum, u) => sum + u.passages.length, 0)}`)
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">구글 시트 연동 테스트</h1>
        <div className="bg-white border border-border rounded-lg p-6 shadow-sm">
          <SheetImporter 
            groupName="테스트 그룹" 
            onRegister={handleRegister} 
          />
        </div>
      </div>
    </div>
  )
}




































