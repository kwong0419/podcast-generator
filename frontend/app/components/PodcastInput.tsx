import {useState, useRef} from 'react'

// Define the props interface
interface PodcastInputProps {
  onGenerate: (input: string | File) => Promise<void> // Callback function that handles generation
  isGenerating: boolean // Loading state indicator
}

export default function PodcastInput({onGenerate, isGenerating}: PodcastInputProps) {
  // State management
  const [inputType, setInputType] = useState<'text' | 'file'>('text') // Toggle between input types
  const [transcript, setTranscript] = useState('') // Store text input
  const fileInputRef = useRef<HTMLInputElement>(null) // Reference to file input for resetting
  const [selectedFile, setSelectedFile] = useState<File | null>(null) // Store selected audio file

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (inputType === 'text' && transcript.trim()) {
      await onGenerate(transcript)
    } else if (inputType === 'file' && selectedFile) {
      await onGenerate(selectedFile)
    }
  }

  // Handle file selection with validation
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.type.startsWith('audio/')) {
        setSelectedFile(file)
      } else {
        alert('Please select an audio file')
        if (fileInputRef.current) {
          fileInputRef.current.value = '' // Reset file input
        }
      }
    }
  }

  return (
    <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <div className="flex gap-4 mb-6">
        <button
          type="button"
          onClick={() => setInputType('text')}
          className={`flex-1 py-2 px-4 rounded-lg transition-colors ${
            inputType === 'text' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Text Transcript
        </button>
        <button
          type="button"
          onClick={() => setInputType('file')}
          className={`flex-1 py-2 px-4 rounded-lg transition-colors ${
            inputType === 'file' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Audio File
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {inputType === 'text' ? (
          <textarea
            className="w-full h-40 p-4 text-black border rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter your transcript here..."
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
          />
        ) : (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <input
              type="file"
              ref={fileInputRef}
              accept="audio/*"
              onChange={handleFileChange}
              className="hidden"
              id="audio-upload"
            />
            <label htmlFor="audio-upload" className="cursor-pointer text-blue-500 hover:text-blue-600">
              {selectedFile ? selectedFile.name : 'Click to upload audio file'}
            </label>
          </div>
        )}

        <button
          type="submit"
          disabled={isGenerating || (!transcript && !selectedFile)}
          className={`w-full py-3 px-4 rounded-lg transition-colors ${
            isGenerating || (!transcript && !selectedFile)
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          }`}
        >
          {isGenerating ? 'Generating...' : 'Generate Podcast'}
        </button>
      </form>
    </div>
  )
}
