import './globals.css'

export const metadata = {
  title: 'Gas Mileage Dashboard',
  description: 'Track your vehicle fuel efficiency and costs',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
