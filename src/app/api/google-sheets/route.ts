import { NextRequest, NextResponse } from 'next/server'

interface SheetRow {
  number: string
  englishPassage: string
  koreanTranslation: string
}

interface ParsedSheet {
  sheetName: string
  gid: string
  passages: SheetRow[]
}

interface GoogleSheetProperties {
  sheetId: number
  title: string
}

interface GoogleSheetData {
  properties: {
    title: string
  }
  sheets: {
    properties: GoogleSheetProperties
  }[]
}

// 구글 시트 URL에서 시트 ID 추출
function extractSheetId(url: string): string | null {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
  return match ? match[1] : null
}

// CSV 파싱 함수 (쉼표가 포함된 셀 처리)
function parseCSV(csvText: string): string[][] {
  const rows: string[][] = []
  const lines = csvText.split('\n')
  
  for (const line of lines) {
    if (!line.trim()) continue
    
    const row: string[] = []
    let cell = ''
    let inQuotes = false
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cell += '"'
          i++
        } else {
          inQuotes = !inQuotes
        }
      } else if (char === ',' && !inQuotes) {
        row.push(cell.trim())
        cell = ''
      } else {
        cell += char
      }
    }
    row.push(cell.trim())
    rows.push(row)
  }
  
  return rows
}

// Google Sheets API를 사용하여 문서 정보와 모든 시트 탭 정보 가져오기
async function getSheetInfoWithAPI(sheetId: string): Promise<{ 
  title: string
  tabs: { name: string; gid: string }[] 
}> {
  const apiKey = process.env.GOOGLE_SHEETS_API_KEY
  
  if (!apiKey) {
    console.error('GOOGLE_SHEETS_API_KEY is not set')
    throw new Error('Google Sheets API key is not configured')
  }
  
  const apiUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?key=${apiKey}`
  
  const response = await fetch(apiUrl)
  
  if (!response.ok) {
    const errorText = await response.text()
    console.error('Google Sheets API error:', errorText)
    throw new Error(`Failed to fetch sheet metadata: ${response.status}`)
  }
  
  const data: GoogleSheetData = await response.json()
  
  // 문서 제목
  const title = data.properties.title
  
  // 모든 시트 탭 정보 추출
  const tabs = data.sheets.map(sheet => ({
    name: sheet.properties.title,
    gid: String(sheet.properties.sheetId)
  }))
  
  console.log(`Document: "${title}", Found ${tabs.length} sheets:`, tabs.map(t => t.name).join(', '))
  
  return { title, tabs }
}

// 특정 탭의 CSV 데이터 가져오기
async function fetchSheetCSV(sheetId: string, gid: string): Promise<string> {
  const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`
  
  const response = await fetch(csvUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  })
  
  if (!response.ok) {
    throw new Error(`Failed to fetch CSV: ${response.status}`)
  }
  
  return response.text()
}

// POST /api/google-sheets - 구글 시트 데이터 조회
export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()
    
    if (!url) {
      return NextResponse.json(
        { error: 'Google Sheet URL is required' },
        { status: 400 }
      )
    }
    
    const sheetId = extractSheetId(url)
    
    if (!sheetId) {
      return NextResponse.json(
        { error: 'Invalid Google Sheet URL' },
        { status: 400 }
      )
    }
    
    console.log('Fetching sheets for:', sheetId)
    
    // Google Sheets API로 문서 정보와 모든 탭 정보 가져오기
    const { title: documentTitle, tabs } = await getSheetInfoWithAPI(sheetId)
    console.log('Tabs to fetch:', tabs)
    
    // 각 탭의 데이터 병렬로 가져오기
    const sheetPromises = tabs.map(async (tab) => {
      try {
        console.log(`Fetching tab: ${tab.name} (gid=${tab.gid})`)
        const csvText = await fetchSheetCSV(sheetId, tab.gid)
        const rows = parseCSV(csvText)
        
        // 첫 번째 행은 헤더 (번호, 영어지문, 한글해석)
        const passages: SheetRow[] = []
        
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i]
          if (row.length >= 2 && row[0] && row[1]) {
            passages.push({
              number: row[0] || String(i),
              englishPassage: row[1] || '',
              koreanTranslation: row[2] || ''
            })
          }
        }
        
        if (passages.length > 0) {
          console.log(`Tab ${tab.name}: ${passages.length} passages`)
          return {
            sheetName: tab.name,
            gid: tab.gid,
            passages
          }
        }
        return null
      } catch (error) {
        console.error(`Error fetching tab ${tab.name}:`, error)
        return null
      }
    })
    
    const results = await Promise.all(sheetPromises)
    const sheets: ParsedSheet[] = results.filter((s): s is ParsedSheet => s !== null)
    
    if (sheets.length === 0) {
      return NextResponse.json(
        { error: 'No data found in the sheet' },
        { status: 404 }
      )
    }
    
    // 구글 시트 문서 제목을 파일명으로 사용
    const fileName = documentTitle
    
    console.log(`Total sheets: ${sheets.length}, Total passages: ${sheets.reduce((sum, s) => sum + s.passages.length, 0)}`)
    
    return NextResponse.json({
      fileName,
      sheetId,
      sheets
    })
  } catch (error) {
    console.error('Error fetching Google Sheet:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch Google Sheet data' },
      { status: 500 }
    )
  }
}
