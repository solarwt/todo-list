import './globals.css'

export const metadata = {
  title: 'Todo Reminder',
  description: '一个清爽专业的 Next.js 待办提醒工具。',
}

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}
