import './globals.css'

export const metadata = {
  title: 'Todo Reminder',
  description: '一个基于 Next.js 的待办提醒应用',
}

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}
