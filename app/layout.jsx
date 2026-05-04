import './globals.css'

export const metadata = {
  title: 'Local GTD Pro',
  description: '本地优先的 GTD 任务工作台，支持 Inbox、项目、标签、预测、旗标、复盘和自定义视角。',
}

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}
