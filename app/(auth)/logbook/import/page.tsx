'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { parseUddfString, type ParsedDive, type UddfParseResult } from '@/lib/uddf/parse'

type Phase = 'upload' | 'preview' | 'importing' | 'done'

export default function ImportPage() {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [parseResult, setParseResult] = useState<UddfParseResult | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [progress, setProgress] = useState({ imported: 0, total: 0, failed: 0 })

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return

    if (!f.name.toLowerCase().endsWith('.uddf')) {
      setFileError('Please select a .uddf file. Export from Garmin Dive app → History → Export.')
      return
    }

    setFileError(null)
    const xml = await f.text()
    const result = parseUddfString(xml)

    if (result.fatalError) {
      setFileError(result.fatalError)
      return
    }

    if (result.dives.length === 0) {
      setFileError('No dives found in this file. Try exporting from your dive app again.')
      return
    }

    setFile(f)
    setParseResult(result)
    setPhase('preview')
  }

  function handleCancel() {
    setFile(null)
    setParseResult(null)
    setFileError(null)
    setPhase('upload')
  }

  async function handleConfirmImport() {
    if (!parseResult || !file) return

    setPhase('importing')
    setProgress({ imported: 0, total: parseResult.dives.length, failed: 0 })

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    // Upload raw file to storage (non-fatal if fails)
    let uddfFileUrl: string | null = null
    const storagePath = `${user.id}/${Date.now()}-${file.name}`
    const { error: uploadError } = await supabase.storage
      .from('dive-files')
      .upload(storagePath, file, { contentType: 'application/octet-stream', upsert: false })
    if (!uploadError) {
      uddfFileUrl = storagePath
    }

    const today = new Date().toISOString().split('T')[0]
    let failed = 0

    for (const dive of parseResult.dives) {
      const { error } = await supabase.from('dive_logs').insert({
        user_id: user.id,
        dive_date: dive.diveDate ?? today,
        dive_number: dive.diveNumber,
        max_depth_ft: dive.maxDepthFt,
        avg_depth_ft: dive.avgDepthFt,
        bottom_time_minutes: dive.bottomTimeMinutes,
        surface_interval_minutes: dive.surfaceIntervalMinutes,
        water_temp_surface_f: dive.waterTempSurfaceF,
        water_temp_bottom_f: dive.waterTempBottomF,
        air_in_psi: dive.airInPsi,
        air_out_psi: dive.airOutPsi,
        tank_size: dive.tankSize,
        weight_lbs: dive.weightLbs,
        computer: dive.computerName,
        uddf_file_url: uddfFileUrl,
        dive_type: 'recreational',
      })

      if (error) failed++
      setProgress((p) => ({ ...p, imported: p.imported + 1, failed }))
    }

    setProgress((p) => ({ ...p, failed }))
    setPhase('done')
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-10">
      <div className="mb-6">
        <Link href="/logbook" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
          ← My Slate
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Import from dive computer</h1>
      </div>

      {phase === 'upload' && (
        <UploadPhase onFileChange={handleFileChange} error={fileError} />
      )}

      {phase === 'preview' && parseResult && (
        <PreviewPhase
          result={parseResult}
          onCancel={handleCancel}
          onConfirm={handleConfirmImport}
        />
      )}

      {phase === 'importing' && (
        <ImportingPhase progress={progress} />
      )}

      {phase === 'done' && (
        <DonePhase progress={progress} />
      )}
    </main>
  )
}

function UploadPhase({
  onFileChange,
  error,
}: {
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  error: string | null
}) {
  return (
    <div>
      <label
        htmlFor="uddf-input"
        className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-gray-200 rounded-xl p-12 cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-colors"
      >
        <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 16v-8m0 0-3 3m3-3 3 3M6 20h12a2 2 0 002-2V8a2 2 0 00-.586-1.414l-4-4A2 2 0 0013.172 2H6a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
        <span className="text-sm font-medium text-gray-600">Choose .uddf file</span>
        <span className="text-xs text-gray-400">or drag and drop</span>
        <input
          id="uddf-input"
          type="file"
          accept=".uddf"
          className="sr-only"
          onChange={onFileChange}
        />
      </label>

      {error && (
        <p className="mt-3 text-sm text-red-600">{error}</p>
      )}

      <p className="mt-4 text-xs text-gray-400">
        Supported: Garmin Dive app exports (.uddf) · Suunto DM · any UDDF 3.x file
      </p>
    </div>
  )
}

function PreviewPhase({
  result,
  onCancel,
  onConfirm,
}: {
  result: UddfParseResult
  onCancel: () => void
  onConfirm: () => void
}) {
  const divesWithWarnings = result.dives.filter((d) => d.parseWarnings.length > 0)

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">
        Found <span className="font-semibold text-gray-900">{result.dives.length} dives</span>
        {result.computerName && (
          <> from <span className="font-semibold text-gray-900">{result.computerName}</span></>
        )}
      </p>

      <ul className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden mb-4">
        {result.dives.map((dive, i) => (
          <DiveRow key={i} dive={dive} index={i} />
        ))}
      </ul>

      {divesWithWarnings.length > 0 && (
        <p className="text-xs text-amber-600 mb-4">
          {divesWithWarnings.length} dive{divesWithWarnings.length > 1 ? 's' : ''} had parsing warnings — they will still be imported with available data.
        </p>
      )}

      <div className="flex items-center gap-3 justify-end">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          Import {result.dives.length} dives →
        </button>
      </div>
    </div>
  )
}

function DiveRow({ dive, index }: { dive: ParsedDive; index: number }) {
  const hasWarnings = dive.parseWarnings.length > 0

  return (
    <li className="flex items-center gap-4 px-4 py-3 bg-white">
      <span className="w-8 text-center text-xs text-gray-300 font-mono shrink-0">
        #{dive.diveNumber ?? index + 1}
      </span>

      <div className="flex-1 min-w-0">
        {dive.diveDate ? (
          <p className="text-sm text-gray-700">
            {new Date(dive.diveDate + 'T12:00:00').toLocaleDateString('en-US', {
              month: 'short', day: 'numeric', year: 'numeric',
            })}
          </p>
        ) : (
          <p className="text-sm text-amber-500">Unknown date</p>
        )}
      </div>

      <div className="flex gap-4 text-right shrink-0">
        {dive.maxDepthFt && (
          <div>
            <p className="text-sm font-medium text-gray-700">{dive.maxDepthFt}ft</p>
            <p className="text-xs text-gray-400">depth</p>
          </div>
        )}
        {dive.bottomTimeMinutes && (
          <div>
            <p className="text-sm font-medium text-gray-700">{dive.bottomTimeMinutes}min</p>
            <p className="text-xs text-gray-400">bottom</p>
          </div>
        )}
      </div>

      {hasWarnings && (
        <span title={dive.parseWarnings.join('\n')} className="text-amber-400 shrink-0">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
        </span>
      )}
    </li>
  )
}

function ImportingPhase({ progress }: { progress: { imported: number; total: number } }) {
  const pct = progress.total > 0 ? Math.round((progress.imported / progress.total) * 100) : 0

  return (
    <div className="text-center py-8">
      <p className="text-sm font-medium text-gray-700 mb-4">
        Importing dives… {progress.imported} / {progress.total}
      </p>
      <div className="w-full bg-gray-100 rounded-full h-2 mb-4">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-200"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-gray-400">Do not close this tab.</p>
    </div>
  )
}

function DonePhase({ progress }: { progress: { imported: number; total: number; failed: number } }) {
  const succeeded = progress.total - progress.failed

  return (
    <div className="text-center py-8">
      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>

      {progress.failed === 0 ? (
        <p className="text-lg font-semibold text-gray-900 mb-1">
          {succeeded} dive{succeeded !== 1 ? 's' : ''} imported
        </p>
      ) : (
        <>
          <p className="text-lg font-semibold text-gray-900 mb-1">
            {succeeded} of {progress.total} dives imported
          </p>
          <p className="text-sm text-red-500 mb-2">{progress.failed} failed to save</p>
        </>
      )}

      <Link
        href="/logbook"
        className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
      >
        ← Go to my logbook
      </Link>
    </div>
  )
}
