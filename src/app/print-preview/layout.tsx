/**
 * 인쇄 전용 레이아웃
 * 
 * 사이드바, 네비게이션 등 불필요한 요소 없이
 * 순수하게 인쇄할 콘텐츠만 렌더링합니다.
 */

export default function PrintPreviewLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <head>
        <title>인쇄 미리보기</title>
        <meta name="robots" content="noindex, nofollow" />
      </head>
      <body className="print-body bg-white m-0 p-0">
        {children}
      </body>
    </html>
  )
}




