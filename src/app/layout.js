import './globals.css'

export const metadata = {
  title: 'PixL Admin',
  description: 'PixL Digital Signage System',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
