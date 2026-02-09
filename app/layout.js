import './globals.css';

export const metadata = {
  title: 'Task Manager - 极简任务管理',
  description: '基于 Markdown 和 Next.js 的 Kanban 任务管理器',
  robots: 'index, follow',
  openGraph: {
    title: 'Task Manager - 极简任务管理',
    description: '基于 Markdown 和 Next.js 的 Kanban 任务管理器',
    type: 'website',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
