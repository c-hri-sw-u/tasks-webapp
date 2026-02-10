import './globals.css';
import { Providers } from './providers';

export const metadata = {
  title: 'Task Manager - Minimalist Task Management',
  description: 'A minimalist Kanban task manager based on Markdown and Next.js',
  robots: 'index, follow',
  openGraph: {
    title: 'Task Manager - Minimalist Task Management',
    description: 'A minimalist Kanban task manager based on Markdown and Next.js',
    type: 'website',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
