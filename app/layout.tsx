import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Talk To Data",
  description: "Transform Google Sheets into beautiful dashboards",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Debug: Check environment variables (only runs server-side during build)
  if (typeof window === 'undefined') {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔧 SERVER ENVIRONMENT CHECK:');
    console.log('  Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing');
    console.log('  Supabase Key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing');
    console.log('  Google Client:', process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ? '✅ Set' : '❌ Missing');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  }

  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}