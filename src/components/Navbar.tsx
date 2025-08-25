// src/components/Navbar.tsx
import Link from 'next/link';

export function Navbar() {
  return (
    <nav className="flex gap-4 p-4 bg-gray-800 text-white">
      <Link href="/">Home</Link>
      <Link href="/conversational-ai">Conversational AI</Link>
      <Link href="/text-to-speech">Text To Speech</Link>
      <Link href="/speech-to-text">Speech To Text</Link>
    </nav>
  );
}