

'use client';

import { useConversation } from '@elevenlabs/react';
import { useCallback, useState } from 'react';

export default function Conversation() {
  const [showModal, setShowModal] = useState(false);

  const conversation = useConversation({
    onConnect: () => console.log('Connected'),
    onDisconnect: () => console.log('Disconnected'),
    onMessage: (message) => console.log('Message:', message),
    onError: (error) => console.error('Error:', error),
  });

  const startConversation = useCallback(async () => {
    const agent_id = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID;
    if (!agent_id) {
      throw new Error('Missing NEXT_PUBLIC_ELEVENLABS_AGENT_ID');
    }

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      await conversation.startSession({
        agentId: agent_id,
        connectionType: 'webrtc',
      });
    } catch (error) {
      console.error('Failed to start conversation:', error);
    }
  }, [conversation]);

  const stopConversation = useCallback(async () => {
    await conversation.endSession();
  }, [conversation]);

  return (
    <div className="min-h-screen flex flex-col">
      <div className="px-4 py-6 text-center">
        <h2 className="text-4xl font-semibold mb-2 mt-20">
          Talk with Rachel the voice agent
        </h2>
          <h2 className="text-lg mt-2 text-gray-700">
         Her default language is English but she speaks Japanese as well.
        </h2>
      </div>

      <div className="flex-1 flex flex-col mt-27 items-center gap-6 px-4">
        <div className="flex gap-4">
          <button
            onClick={startConversation}
            disabled={conversation.status === 'connected'}
            className="px-6 py-3 bg-green-600 text-white rounded-md shadow disabled:bg-gray-300"
          >
            Start Conversation
          </button>
          <button
            onClick={stopConversation}
            disabled={conversation.status !== 'connected'}
            className="px-6 py-3 bg-red-600 text-white rounded-md shadow disabled:bg-gray-300"
          >
            Stop Conversation
          </button>
        </div>
        <div className="text-center space-y-2">
          <p className="text-lg font-medium mt-9">
            Status: {conversation.status}
          </p>
          <p className="text-sm text-gray-600">
            Agent is {conversation.isSpeaking ? 'speaking' : 'listening'}
          </p>

          <button
            onClick={() => setShowModal(true)}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition"
          >
            Learn More About Rachel
          </button>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 shadow-lg max-w-lg w-full animate-fade-in overflow-y-auto max-h-[90vh]">
            <h3 className="text-2xl font-bold mb-3 text-black">Meet Rachel</h3>
            <p className="text-gray-700 mb-4">
              Rachel is a conversational AI agent powered by ElevenLabs&#39;
              Conversational AI API. She was designed to sound and feel
              human—curious, calm, and context-aware.
            </p>
            <p className="text-gray-700 mb-4">
              Technically, she uses real-time audio streaming and speaker
              conditioning to simulate natural conversation. That means she can
              respond instantly, interrupt politely, and adapt to your tone on
              the fly.
            </p>
            <p className="text-gray-700 mb-4">
              Rachel’s personality was fine-tuned for empathy and clarity. She
              listens closely, asks thoughtful follow-ups, and tailors her
              responses to your experience level—whether you’re a complete
              beginner or deep in the weeds of API integration.
            </p>
            <p className="text-gray-700 mb-4 ">
              To learn how to create your own voice agent using ElevenLabs, visit <a href="https://elevenlabs.io/docs/conversational-ai/quickstart" className="text-blue-600 underline">here</a>.
            </p>
            <div className="flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-800 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
