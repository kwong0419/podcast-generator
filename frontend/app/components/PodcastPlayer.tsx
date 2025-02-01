'use client'

import {useState, useEffect, useRef} from 'react'
import {Segment} from '../types/types'

interface PodcastPlayerProps {
  segments: Segment[]
}

export default function PodcastPlayer({segments}: PodcastPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [isAudioReady, setIsAudioReady] = useState(false)

  // Voice IDs from ElevenLabs (customizable)
  const voices = {
    'Host A': 'cjVigY5qzO86Huf0OWal', // Eric - conversational
    'Host B': 'FGY2WhTYpPnrIDTdsKH5', // Laura - social media
  }

  const generateSpeech = async (text: string, speaker: string): Promise<Blob> => {
    try {
      const voiceId = voices[speaker as keyof typeof voices]
      if (!voiceId) {
        throw new Error(`No voice ID found for speaker: ${speaker}`)
      }

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
        const errorData = await response.json()
        throw new Error(`Failed to generate audio: ${errorData.message || response.status}`)
      }

      return await response.blob()
    } catch (error) {
      throw error
    }
  }

  const concatenateAudioBlobs = async (audioBlobs: Blob[]): Promise<Blob> => {
    if (audioBlobs.length === 0) {
      throw new Error('No audio blobs to concatenate')
    }

    const audioContext = new (window.AudioContext || window.webkitAudioContext)()

    const audioBuffers = await Promise.all(
      audioBlobs.map(async (blob) => {
        const arrayBuffer = await blob.arrayBuffer()
        return await audioContext.decodeAudioData(arrayBuffer)
      }),
    ).catch((error) => {
      throw new Error('Failed to decode audio data: ' + error.message)
    })

    const validBuffers = audioBuffers.filter((buffer) => buffer !== null)

    if (validBuffers.length === 0) {
      throw new Error('No valid audio buffers after decoding')
    }

    const totalLength = validBuffers.reduce((acc, buffer) => acc + buffer.length, 0)
    const finalBuffer = audioContext.createBuffer(
      validBuffers[0].numberOfChannels,
      totalLength,
      validBuffers[0].sampleRate,
    )

    let offset = 0
    for (const buffer of validBuffers) {
      for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
        finalBuffer.getChannelData(channel).set(buffer.getChannelData(channel), offset)
      }
      offset += buffer.length
    }

    const mediaStreamDestination = audioContext.createMediaStreamDestination()
    const source = audioContext.createBufferSource()
    source.buffer = finalBuffer
    source.connect(mediaStreamDestination)
    source.start(0)

    return new Promise((resolve) => {
      const mediaRecorder = new MediaRecorder(mediaStreamDestination.stream)
      const chunks: BlobPart[] = []

      mediaRecorder.ondataavailable = (e) => chunks.push(e.data)
      mediaRecorder.onstop = () => resolve(new Blob(chunks, {type: 'audio/webm'}))

      mediaRecorder.start()
      setTimeout(() => mediaRecorder.stop(), finalBuffer.duration * 1000 + 100)
    })
  }

  const loadAudioSegments = async () => {
    setIsLoading(true)
    setIsAudioReady(false)
    const audioBlobs: Blob[] = []

    try {
      if (!segments || segments.length === 0) {
        throw new Error('No segments provided')
      }

      for (const segment of segments) {
        const audioBlob = await generateSpeech(segment.text, segment.speaker)
        if (!audioBlob || audioBlob.size === 0) {
          throw new Error('Invalid audio generated')
        }
        audioBlobs.push(audioBlob)
        await new Promise((resolve) => setTimeout(resolve, 250))
      }

      const concatenatedBlob = await concatenateAudioBlobs(audioBlobs)
      const url = URL.createObjectURL(concatenatedBlob)
      setAudioUrl(url)

      if (audioRef.current) {
        audioRef.current.src = url
        audioRef.current.load()
        setIsAudioReady(true)
      }
    } catch (error) {
      setAudioUrl(null)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadAudioSegments()
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl)
      }
    }
  }, [segments])

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
    }
  }

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration)
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value)
    if (audioRef.current) {
      audioRef.current.currentTime = time
      setCurrentTime(time)
    }
  }

  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  return (
    <div className="max-w-2xl mx-auto mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-4">Podcast Player</h2>
      <div className="flex flex-col items-center space-y-4">
        <audio
          ref={audioRef}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={() => setIsPlaying(false)}
        />

        <div className="w-full flex items-center space-x-2">
          <span className="text-sm">{formatTime(currentTime)}</span>
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={handleSeek}
            disabled={!isAudioReady}
            className={`flex-grow h-2 rounded-lg appearance-none ${
              isAudioReady ? 'bg-gray-200 dark:bg-gray-700 cursor-pointer' : 'bg-gray-300 cursor-not-allowed'
            }`}
          />
          <span className="text-sm">{formatTime(duration)}</span>
        </div>

        <div className="flex items-center space-x-4">
          <button
            onClick={togglePlayPause}
            disabled={isLoading || !isAudioReady}
            className={`px-4 py-2 rounded-lg ${
              !isAudioReady || isLoading ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            {isLoading ? 'Generating...' : isPlaying ? 'Pause' : 'Play'}
          </button>
        </div>

        {isAudioReady && (
          <div className="text-sm text-gray-500">
            Current segment: {segments[Math.floor((currentTime / duration) * segments.length)]?.text || ''}
          </div>
        )}
      </div>
    </div>
  )
}
