'use client';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-5xl font-bold mb-8">
          Trevor&#39;s ElevenLabs AI Voice App
        </h1>

        <div className="max-w-4xl mx-auto px-6 py-12 text-white">
          {/* Summary */}
          <p className="text-lg leading-relaxed mb-8 text-center">
            A full-featured voice assistant interface built with <strong>Next.js</strong>, powered by the <strong>ElevenLabs Conversational AI API</strong>, and deployed globally via <strong>Vercel</strong>.
            Users can speak with <span className="font-semibold">Rachel</span>, a proactive and human-like voice agent—perfect for demonstrating ElevenLabs’ conversational capabilities.
          </p>

          {/* Nav Section Overview */}
          <div className="space-y-6 mb-12">
            <div>
              <h2 className="text-xl font-semibold mb-2">🔍 App Sections</h2>
              <br/>
              <ul className="list-disc list-inside space-y-2">
                <li>
                  <strong>Conversational AI:</strong> Live interface to start and stop conversations with Rachel who speaks both English and Japanese. See real-time status updates (connected, speaking, listening). Powered by the Conversational AI API.
                </li>
                <br/>
                <li>
                  <strong>Text to Speech:</strong> Enter text and hear it spoken back in Rachel’s voice using ElevenLabs&apos; ultra-realistic TTS.
                </li>
                <br/>
                <li>
                  <strong>Speech to Text:</strong> (Optional) Use ElevenLabs&#39; STT to transcribe spoken audio into accurate, real-time text.
                </li>
              </ul>
            </div>

            {/* About Trevor Section */}
            <div>
              <h2 className="text-xl font-semibold mb-2">🧑 About Trevor</h2>
              <p className="text-white-700 leading-relaxed mb-4">
                Trevor Mearns is a dynamic fullstack developer, professional educator, and support wizard. Born in Seattle, he now calls Japan home and brings a global, multilingual perspective to tech and teaching. He thrives on curiosity, adaptability, and creating solutions that truly connect with people.
              </p>
              <p className="text-white-700 leading-relaxed mb-4">
                Over the years, Trevor has built diverse experiences—running an English school, crafting software that users love, and guiding learners with patience and insight. Whether coding or teaching, he balances technical expertise with genuine empathy.
              </p>
              <p className="text-white-700 leading-relaxed">
                His path spans deep support work, engaging education, and thoughtful full-stack development—all unified by a passion for solving problems and fostering connection.
              </p>
            </div>

            {/* External Links */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
              <a
                href="https://github.com/Trevorton27/voice-app"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded shadow"
              >
              GitHub Repo for app.
              </a>
              <a
                href="https://trevormearns.com"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded shadow"
              >
                My Personal Website
              </a>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
