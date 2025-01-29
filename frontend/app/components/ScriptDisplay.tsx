import {Segment} from '../types/types'

export default function ScriptDisplay({segments}: {segments: Segment[]}) {
  return (
    <div className="max-w-2xl mx-auto mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-4">Generated Script</h2>
      <div className="space-y-4">
        {segments.map((segment, index) => (
          <div key={index} className="flex flex-col space-y-1">
            <span className="font-bold text-blue-500">{segment.speaker}</span>
            <p className="text-gray-700 dark:text-gray-300">{segment.text}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
