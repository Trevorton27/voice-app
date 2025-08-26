// src/components/Navbar.tsx
import Link from 'next/link';

export function Navbar() {
  return (
<nav className="flex justify-between items-center p-5 bg-gray-800 text-white">
  {/* Left-side (Home) */}
  <Link href="/" className="text-white ml-6">
    Trevor&#39;s AI Voice App
  </Link>

  {/* Right-side (other links) */}
  <div className="flex gap-4 mr-6">
    <Link href="/conversational-ai">Conversational AI</Link>
    <Link href="/text-to-speech">Text To Speech</Link>
    <Link href="/speech-to-text">Speech To Text</Link>
  </div>
</nav>

  );
}