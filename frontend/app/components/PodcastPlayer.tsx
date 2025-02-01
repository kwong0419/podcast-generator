'use client'

import {useState, useEffect, useRef} from 'react'
import {Segment} from '../types/types'

interface PodcastPlayerProps {
  segments: Segment[]
}

export default function PodcastPlayer({segments}: PodcastPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0)
  const [audioQueue, setAudioQueue] = useState<HTMLAudioElement[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const currentAudioRef = useRef<HTMLAudioElement | null>(null)

  // Voice IDs from ElevenLabs (customizable)
  const voices = {
    'Host A': 'pNInz6obpgDQGcFmaJgB', // Adam
    'Host B': 'yoZ06aMxZJJ28mfd3POQ', // Sam
  }

  const generateSpeech = async (text: string, voiceId: string): Promise<Blob> => {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        Accept: 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY!,
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5,
        },
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('ElevenLabs API Error:', errorData)
      throw new Error(`Failed to generate audio: ${response.status}`)
    }

    return await response.blob()
  }

  const loadAudioSegments = async () => {
    setIsLoading(true)
    const audioElements: HTMLAudioElement[] = []

    try {
      for (const segment of segments) {
        if (segment.speaker in voices) {
          const audioBlob = await generateSpeech(segment.text, voices[segment.speaker as keyof typeof voices])

          const audioUrl = URL.createObjectURL(audioBlob)
          const audio = new Audio(audioUrl)

          // Add ended event listener to play next segment
          audio.addEventListener('ended', () => {
            playNextSegment()
          })

          audioElements.push(audio)
        }
      }
      setAudioQueue(audioElements)
    } catch (error) {
      console.error('Error loading audio segments:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadAudioSegments()
    return () => {
      // Cleanup audio elements when component unmounts
      audioQueue.forEach((audio) => {
        audio.pause()
        audio.src = ''
      })
    }
  }, [segments])

  const playNextSegment = () => {
    if (currentSegmentIndex < audioQueue.length - 1) {
      setCurrentSegmentIndex((prev) => prev + 1)
      playSegment(currentSegmentIndex + 1)
    } else {
      setIsPlaying(false)
      setCurrentSegmentIndex(0)
    }
  }

  const playSegment = (index: number) => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause()
    }
    const audio = audioQueue[index]
    if (audio) {
      currentAudioRef.current = audio
      audio.play()
    }
  }

  const togglePlayPause = () => {
    if (isPlaying) {
      currentAudioRef.current?.pause()
    } else {
      playSegment(currentSegmentIndex)
    }
    setIsPlaying(!isPlaying)
  }

  return (
    <div className="max-w-2xl mx-auto mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-4">Podcast Player</h2>
      <div className="flex flex-col items-center space-y-4">
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className="bg-blue-600 h-2.5 rounded-full"
            style={{width: `${(currentSegmentIndex / segments.length) * 100}%`}}
          ></div>
        </div>

        <div className="flex items-center space-x-4">
          <button
            onClick={togglePlayPause}
            disabled={isLoading || audioQueue.length === 0}
            className={`px-4 py-2 rounded-lg ${
              isLoading ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            {isLoading ? 'Loading...' : isPlaying ? 'Pause' : 'Play'}
          </button>
        </div>

        <div className="text-sm text-gray-500">
          {segments[currentSegmentIndex]?.speaker}: {segments[currentSegmentIndex]?.text}
        </div>
      </div>
    </div>
  )
}
