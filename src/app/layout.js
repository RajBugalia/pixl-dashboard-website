import './globals.css'

export const metadata = {
  title: 'Viewo Admin',
  description: 'Viewo Digital Signage System',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
