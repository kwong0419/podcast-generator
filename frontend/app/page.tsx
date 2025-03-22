'use client'

import {useState} from 'react'
import Image from 'next/image'
import PodcastInput from './components/PodcastInput'
import ScriptDisplay from './components/ScriptDisplay'
import PodcastPlayer from './components/PodcastPlayer'
import {Segment} from './types/types'
import {API_URL} from './config'

export default function Home() {
  const [generatedSegments, setGeneratedSegments] = useState<Segment[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string>('')

  const handleGenerate = async (input: string | File) => {
    setIsGenerating(true)
    setError('')

    try {
      // check if input is a file or a transcript, set endpoint accordingly
      const endpoint = input instanceof File ? '/api/generate-podcast' : '/api/generate-from-transcript'
      const formData = new FormData()

      if (input instanceof File) {
        formData.append('audio', input)
      } else {
        formData.append('transcript', input)
      }

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to generate podcast')
      }

      const data = await response.json()

      if (!data.segments || data.segments.length === 0) {
        throw new Error('No segments were generated')
      }

      setGeneratedSegments(data.segments)
    } catch (err) {
      console.error('Generation error:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
      setGeneratedSegments([]) // Reset segments on error
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-center gap-2 mb-8">
        <Image
          src="/microphone.png"
          alt="Podcast microphone icon"
          width={32}
          height={32}
          className="brightness-0 invert"
          priority
        />
        <h1 className="text-4xl font-bold">PodcastAI Creator</h1>
      </div>

      <PodcastInput onGenerate={handleGenerate} isGenerating={isGenerating} />

      {error && <div className="text-red-500 text-center my-4">{error}</div>}

      {generatedSegments && (
        <>
          <PodcastPlayer segments={generatedSegments} />
          <ScriptDisplay segments={generatedSegments} />
        </>
      )}
    </div>
  )
}
