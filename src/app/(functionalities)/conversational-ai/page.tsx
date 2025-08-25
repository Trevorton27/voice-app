'use client';

import { useConversation } from '@elevenlabs/react';
import { useCallback } from 'react';


export default function Conversation() {
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


  /*const startConversation = useCallback(async () => {

    const agent_id = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID;
    try {
      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });

      // Start the conversation with your agent


      await conversation.startSession({
        agentId: agent_id,
         connectionType: 'webrtc',
      });

    } catch (error) {
      console.error('Failed to start conversation:', error);
    }
  }, [conversation]);*/

  const stopConversation = useCallback(async () => {
    await conversation.endSession();
  }, [conversation]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex gap-2">
        <button
          onClick={startConversation}
          disabled={conversation.status === 'connected'}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
        >
          Start Conversation
        </button>
        <button
          onClick={stopConversation}
          disabled={conversation.status !== 'connected'}
          className="px-4 py-2 bg-red-500 text-white rounded disabled:bg-gray-300"
        >
          Stop Conversation
        </button>
      </div>

      <div className="flex flex-col items-center">
        <p>Status: {conversation.status}</p>
        <p>Agent is {conversation.isSpeaking ? 'speaking' : 'listening'}</p>
      </div>
    </div>
  );
}
