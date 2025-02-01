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

  // Voice IDs from ElevenLabs
  const voices = {
    'Host A': 'UgBBYS2sOqTuMpoF3BR0', // Mark
    'Host B': '56AoDkrOh6qfVPDXZ7Pt', // Cassidy
  }

  const generateSpeech = async (text: string, voiceId: string): Promise<Blob> => {
    console.log('Generating speech for:', text, 'with voice:', voiceId)

    try {
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
        console.error('ElevenLabs API Error:', errorData)
        throw new Error(`Failed to generate audio: ${errorData.message || response.status}`)
      }

      return await response.blob()
    } catch (error) {
      console.error('Error generating speech:', error)
      throw error
    }
  }

  const concatenateAudioBlobs = async (audioBlobs: Blob[]): Promise<Blob> => {
    const audioBuffers = await Promise.all(
      audioBlobs.map(async (blob) => {
        const arrayBuffer = await blob.arrayBuffer()
        const audioContext = new (window.AudioContext || window.AudioContext)()
        return await audioContext.decodeAudioData(arrayBuffer)
      }),
    )

    // Calculate total duration
    const totalLength = audioBuffers.reduce((acc, buffer) => acc + buffer.length, 0)

    // Create a new audio context for concatenation
    const audioContext = new (window.AudioContext || window.AudioContext)()
    const finalBuffer = audioContext.createBuffer(
      audioBuffers[0].numberOfChannels,
      totalLength,
      audioBuffers[0].sampleRate,
    )

    // Concatenate all audio buffers
    let offset = 0
    for (const buffer of audioBuffers) {
      for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
        const channelData = buffer.getChannelData(channel)
        finalBuffer.getChannelData(channel).set(channelData, offset)
      }
      offset += buffer.length
    }

    // Convert back to blob
    const mediaStreamSource = audioContext.createMediaStreamDestination()
    const source = audioContext.createBufferSource()
    source.buffer = finalBuffer
    source.connect(mediaStreamSource)
    source.start(0)

    return new Promise((resolve) => {
      const mediaRecorder = new MediaRecorder(mediaStreamSource.stream)
      const chunks: BlobPart[] = []

      mediaRecorder.ondataavailable = (e) => chunks.push(e.data)
      mediaRecorder.onstop = () => resolve(new Blob(chunks, {type: 'audio/mpeg'}))

      mediaRecorder.start()
      setTimeout(() => mediaRecorder.stop(), finalBuffer.duration * 1000 + 100)
    })
  }

  const loadAudioSegments = async () => {
    console.log('Loading audio segments for:', segments)
    setIsLoading(true)
    const audioBlobs: Blob[] = []

    try {
      // Process segments sequentially instead of in parallel
      for (const segment of segments) {
        const audioBlob = await generateSpeech(segment.text, voices[segment.speaker as keyof typeof voices])
        audioBlobs.push(audioBlob)

        // Add a small delay between requests to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 250))
      }

      const concatenatedBlob = await concatenateAudioBlobs(audioBlobs)
      const url = URL.createObjectURL(concatenatedBlob)
      setAudioUrl(url)

      if (audioRef.current) {
        audioRef.current.src = url
        audioRef.current.load()
      }
    } catch (error) {
      console.error('Error loading audio segments:', error)
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
            className="flex-grow h-2 rounded-lg appearance-none bg-gray-200 dark:bg-gray-700 cursor-pointer"
          />
          <span className="text-sm">{formatTime(duration)}</span>
        </div>

        <div className="flex items-center space-x-4">
          <button
            onClick={togglePlayPause}
            disabled={isLoading || !audioUrl}
            className={`px-4 py-2 rounded-lg ${
              isLoading ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            {isLoading ? 'Loading...' : isPlaying ? 'Pause' : 'Play'}
          </button>
        </div>

        <div className="text-sm text-gray-500">
          {/* Calculate the current segment based on the current time and the duration of the audio */}
          Current segment: {segments[Math.floor((currentTime / duration) * segments.length)]?.text || ''}
        </div>
      </div>
    </div>
  )
}
