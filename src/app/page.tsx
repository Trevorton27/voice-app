'use client';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between px-6 py-16 md:px-12">
      <div className="z-10 max-w-5xl w-full">
        {/* Main Title */}
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-center mb-8">
          Trevor&apos;s ElevenLabs AI Voice App
        </h1>

        <div className="max-w-4xl mx-auto text-center leading-relaxed">
          {/* Summary */}
          <p className="text-base md:text-lg text-muted-foreground mb-12">
            A full-featured voice assistant interface built with{' '}
            <strong>Next.js</strong>, powered by the{' '}
            <strong>ElevenLabs Conversational AI API</strong>, and deployed globally via{' '}
            <strong>Vercel</strong>. Users can speak with{' '}
            <span className="font-semibold">Rachel</span>, a proactive and human-like voice agent—perfect for
            demonstrating ElevenLabs’ conversational capabilities.
          </p>

          {/* Nav Section Overview */}
          <div className="space-y-12 mb-16 text-left">
            <div>
              <h2 className="text-2xl font-bold mb-4">App Sections</h2>
              <ul className="list-disc list-inside space-y-4 text-base md:text-lg text-muted-foreground">
                <li>
                  <strong>Conversational AI:</strong> Live interface to start and stop conversations
                  with Rachel who speaks both English and Japanese. See real-time status updates
                  (connected, speaking, listening). Powered by the Conversational AI API.
                </li>
                <li>
                  <strong>Text to Speech:</strong> Enter text and hear it spoken back in Rachel’s
                  voice using ElevenLabs&apos; ultra-realistic TTS.
                </li>
                <li>
                  <strong>Speech to Text:</strong> (Optional) Use ElevenLabs&apos; STT to transcribe
                  spoken audio into accurate, real-time text.
                </li>
              </ul>
            </div>

            {/* About Trevor Section */}
            <div>
              <h2 className="text-2xl font-bold mb-4"> About Trevor</h2>
              <p className="text-base md:text-lg text-muted-foreground mb-4">
                Trevor Mearns is a dynamic fullstack developer, professional educator, and support
                wizard. Born in Seattle, he now calls Japan home and brings a global, multilingual
                perspective to tech and teaching. He thrives on curiosity, adaptability, and
                creating solutions that truly connect with people.
              </p>
              <p className="text-base md:text-lg text-muted-foreground mb-4">
                Over the years, Trevor has built diverse experiences—running an English school,
                crafting software that users love, and guiding learners with patience and insight.
                Whether coding or teaching, he balances technical expertise with genuine empathy.
              </p>
              <p className="text-base md:text-lg text-muted-foreground">
                His path spans deep support work, engaging education, and thoughtful full-stack
                development—all unified by a passion for solving problems and fostering connection.
              </p>
            </div>

            {/* External Links */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-12">
              <a
                href="https://github.com/Trevorton27/voice-app"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gray-800 hover:bg-gray-700 text-white font-medium py-2 px-5 rounded-md shadow-md transition-colors"
              >
                GitHub Repo for app
              </a>
              <a
                href="https://trevormearns.com"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gray-800 hover:bg-gray-700 text-white font-medium py-2 px-5 rounded-md shadow-md transition-colors"
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
