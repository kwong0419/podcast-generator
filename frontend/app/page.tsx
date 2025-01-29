'use client'

import {useState} from 'react'
import PodcastInput from './components/PodcastInput'
// import PodcastPlayer from '@/components/PodcastPlayer'
// import {ScriptDisplay} from '@/components/ScriptDisplay'

export default function Home() {
  const [generatedScript, setGeneratedScript] = useState<string>('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string>('')

  const handleGenerate = async (input: string | File) => {
    setIsGenerating(true)
    setError('')

    try {
      const endpoint = input instanceof File ? '/api/generate-podcast' : '/api/generate-from-transcript'

      const formData = new FormData()
      if (input instanceof File) {
        formData.append('audio', input)
      } else {
        formData.append('transcript', input)
      }

      const response = await fetch(`http://localhost:5000${endpoint}`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Failed to generate podcast')
      }

      const data = await response.json()
      setGeneratedScript(data.script)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold text-center mb-8">PodcastAI Creator</h1>

      <PodcastInput onGenerate={handleGenerate} isGenerating={isGenerating} />

      {error && <div className="text-red-500 text-center my-4">{error}</div>}

      {generatedScript && (
        <>
          {/* <PodcastPlayer script={generatedScript} />
          <ScriptDisplay script={generatedScript} /> */}
        </>
      )}
    </div>
  )
}
