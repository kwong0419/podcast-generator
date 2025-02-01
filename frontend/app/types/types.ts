export interface PodcastInputProps {
  onGenerate: (input: string | File) => Promise<void> // Callback function that handles generation
  isGenerating: boolean // Loading state indicator
}

export interface PodcastPlayerProps {
  segments: Segment[]
}

export interface Script {
  segments: Segment[]
}

export interface Segment {
  speaker: string
  text: string
}
