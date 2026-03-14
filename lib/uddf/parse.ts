export type ProfilePoint = {
  t: number        // seconds from dive start
  d: number        // depth in feet
  tmp?: number     // water temp in °F (optional)
}

export type ParsedDive = {
  diveNumber: number | null
  diveDate: string | null // YYYY-MM-DD
  computerName: string | null
  maxDepthFt: number | null
  avgDepthFt: number | null
  bottomTimeMinutes: number | null
  surfaceIntervalMinutes: number | null
  waterTempSurfaceF: number | null
  waterTempBottomF: number | null
  airInPsi: number | null
  airOutPsi: number | null
  tankSize: 'al80' | 'al63' | 'hp100' | 'lp85' | 'lp108' | null
  weightLbs: number | null
  profileData: ProfilePoint[] | null
  parseWarnings: string[]
}

export type UddfParseResult = {
  computerName: string | null
  dives: ParsedDive[]
  totalDives: number
  fatalError: string | null
}

function getText(parent: Element, tagName: string): string | null {
  const el = parent.querySelector(tagName)
  return el?.textContent?.trim() ?? null
}

function parseNum(text: string | null): number | null {
  if (text === null) return null
  const n = Number(text)
  return isNaN(n) ? null : n
}

function kelvinToFahrenheit(k: number): number {
  return (k - 273.15) * 9 / 5 + 32
}

function metersToFeet(m: number): number {
  return m * 3.28084
}

function pascalToPsi(pa: number): number {
  return pa / 6894.76
}

function litersToTankSize(liters: number): ParsedDive['tankSize'] {
  if (liters <= 0) return null
  if (liters < 10.8) return 'al63'
  if (liters < 12.5) return 'al80'
  if (liters < 14.8) return 'lp85'
  if (liters < 15.5) return 'hp100'
  return 'lp108'
}

// Downsample to at most maxPoints by taking evenly spaced indices
function downsample<T>(arr: T[], maxPoints: number): T[] {
  if (arr.length <= maxPoints) return arr
  const step = arr.length / maxPoints
  return Array.from({ length: maxPoints }, (_, i) => arr[Math.round(i * step)])
}

function parseProfileData(dive: Element): ProfilePoint[] | null {
  const samples = dive.querySelector('samples')
  if (!samples) return null

  const waypoints = samples.querySelectorAll('waypoint')
  if (waypoints.length === 0) return null

  const points: ProfilePoint[] = []

  waypoints.forEach((wp) => {
    const tText = getText(wp, 'divetime')
    const dText = getText(wp, 'depth')
    const t = parseNum(tText)
    const dM = parseNum(dText)

    if (t === null || dM === null) return

    const point: ProfilePoint = {
      t: Math.round(t),
      d: Math.round(metersToFeet(dM) * 10) / 10,
    }

    const tmpText = getText(wp, 'temperature')
    const tmpK = parseNum(tmpText)
    if (tmpK !== null && tmpK > 200) {
      point.tmp = Math.round(kelvinToFahrenheit(tmpK) * 10) / 10
    }

    points.push(point)
  })

  if (points.length === 0) return null

  // Downsample to 500 points max to keep JSON size reasonable
  return downsample(points, 500)
}

function parseDiveElement(dive: Element, computerName: string | null): ParsedDive {
  const warnings: string[] = []

  const before = dive.querySelector('informationbeforedive')
  const after = dive.querySelector('informationafterdive')

  // Dive number
  const diveNumberText = getText(dive, 'divenumber')
  const diveNumber = parseNum(diveNumberText)

  // Date/time
  let diveDate: string | null = null
  const datetimeText = getText(dive, 'datetime')
  if (datetimeText) {
    diveDate = datetimeText.split('T')[0] ?? null
  } else {
    warnings.push('No date found — dive will be imported with today\'s date')
  }

  // Bottom time (seconds → minutes), prefer informationafterdive
  let bottomTimeMinutes: number | null = null
  const durationAfterText = after ? getText(after, 'diveduration') : null
  const durationBeforeText = before ? getText(before, 'diveduration') : null
  const durationText = durationAfterText ?? durationBeforeText
  const durationSec = parseNum(durationText)
  if (durationSec !== null) {
    bottomTimeMinutes = Math.round(durationSec / 60)
  } else {
    warnings.push('Bottom time not found')
  }

  // Surface interval (seconds → minutes)
  let surfaceIntervalMinutes: number | null = null
  const surfaceIntervalText = before ? getText(before, 'passedtime') : null
  const surfaceIntervalSec = parseNum(surfaceIntervalText)
  if (surfaceIntervalSec !== null) {
    surfaceIntervalMinutes = Math.round(surfaceIntervalSec / 60)
  }

  // Depths (meters → feet)
  let maxDepthFt: number | null = null
  const maxDepthText = after ? getText(after, 'greatestdepth') : null
  const maxDepthM = parseNum(maxDepthText)
  if (maxDepthM !== null) {
    maxDepthFt = Math.round(metersToFeet(maxDepthM) * 10) / 10
  } else {
    warnings.push('Max depth not found')
  }

  let avgDepthFt: number | null = null
  const avgDepthText = after ? getText(after, 'averagedepth') : null
  const avgDepthM = parseNum(avgDepthText)
  if (avgDepthM !== null) {
    avgDepthFt = Math.round(metersToFeet(avgDepthM) * 10) / 10
  }

  // Temperatures (Kelvin → °F)
  let waterTempSurfaceF: number | null = null
  const tempBeforeText = before ? getText(before, 'temperaturebegin') : null
  const tempBeforeK = parseNum(tempBeforeText)
  if (tempBeforeK !== null && tempBeforeK > 200) {
    waterTempSurfaceF = Math.round(kelvinToFahrenheit(tempBeforeK) * 10) / 10
  }

  let waterTempBottomF: number | null = null
  const tempAfterText = after ? getText(after, 'lowesttemperature') : null
  const tempAfterK = parseNum(tempAfterText)
  if (tempAfterK !== null && tempAfterK > 200) {
    waterTempBottomF = Math.round(kelvinToFahrenheit(tempAfterK) * 10) / 10
  }

  // Tank pressure (Pascal → PSI)
  let airInPsi: number | null = null
  let airOutPsi: number | null = null
  let tankSize: ParsedDive['tankSize'] = null
  const tankData = after?.querySelector('tankdata')
  if (tankData) {
    const pressureBeginText = getText(tankData, 'tankpressurebegin')
    const pressureEndText = getText(tankData, 'tankpressureend')
    const pressureBeginPa = parseNum(pressureBeginText)
    const pressureEndPa = parseNum(pressureEndText)
    if (pressureBeginPa !== null) {
      airInPsi = Math.round(pascalToPsi(pressureBeginPa))
    }
    if (pressureEndPa !== null) {
      airOutPsi = Math.round(pascalToPsi(pressureEndPa))
    }

    const tankVolumeText = getText(tankData, 'tankvolume')
    const tankVolumeL = parseNum(tankVolumeText)
    if (tankVolumeL !== null) {
      tankSize = litersToTankSize(tankVolumeL)
      if (tankSize === null) {
        warnings.push(`Unusual tank volume (${tankVolumeL}L) — tank size not mapped`)
      }
    }
  }

  // Weight (kg → lbs)
  let weightLbs: number | null = null
  const weightText = after ? getText(after, 'weight') : null
  const weightKg = parseNum(weightText)
  if (weightKg !== null) {
    weightLbs = Math.round(weightKg * 2.20462 * 10) / 10
  }

  // Depth profile
  const profileData = parseProfileData(dive)

  return {
    diveNumber,
    diveDate,
    computerName,
    maxDepthFt,
    avgDepthFt,
    bottomTimeMinutes,
    surfaceIntervalMinutes,
    waterTempSurfaceF,
    waterTempBottomF,
    airInPsi,
    airOutPsi,
    tankSize,
    weightLbs,
    profileData,
    parseWarnings: warnings,
  }
}

export function parseUddfString(xmlString: string): UddfParseResult {
  const doc = new DOMParser().parseFromString(xmlString, 'application/xml')

  if (doc.documentElement.tagName.toLowerCase() === 'parsererror') {
    return { computerName: null, dives: [], totalDives: 0, fatalError: 'Not valid XML — is this a UDDF file?' }
  }

  if (doc.documentElement.tagName.toLowerCase() !== 'uddf') {
    return { computerName: null, dives: [], totalDives: 0, fatalError: 'Not a UDDF file — root element is not <uddf>' }
  }

  const computerName = getText(doc.documentElement, 'divecomputer name') ?? null

  const diveEls = doc.querySelectorAll('repetitiongroup dive')
  if (diveEls.length === 0) {
    return { computerName, dives: [], totalDives: 0, fatalError: null }
  }

  const dives: ParsedDive[] = []
  diveEls.forEach((diveEl) => {
    try {
      dives.push(parseDiveElement(diveEl, computerName))
    } catch {
      dives.push({
        diveNumber: null,
        diveDate: null,
        computerName,
        maxDepthFt: null,
        avgDepthFt: null,
        bottomTimeMinutes: null,
        surfaceIntervalMinutes: null,
        waterTempSurfaceF: null,
        waterTempBottomF: null,
        airInPsi: null,
        airOutPsi: null,
        tankSize: null,
        weightLbs: null,
        profileData: null,
        parseWarnings: ['Failed to parse this dive — it will still be imported with available fields'],
      })
    }
  })

  return { computerName, dives, totalDives: dives.length, fatalError: null }
}
