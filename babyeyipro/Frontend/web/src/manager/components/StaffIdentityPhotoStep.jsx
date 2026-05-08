import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Upload,
  Camera,
  Loader2,
  AlertTriangle,
  RotateCcw,
  ZoomIn,
  X,
} from 'lucide-react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5100'

const PLEASANT_FRAME_FILTER = 'saturate(1.45) contrast(1.06) brightness(1.04) sepia(0.05)'

function cameraStartErrorMessage(err) {
  const name = err && typeof err === 'object' && 'name' in err ? String(err.name) : ''
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return 'Camera access was blocked. Click the camera icon in the address bar and allow this site, or check site settings for camera.'
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return 'That camera was not found. It may be unplugged—try another device or reconnect the webcam.'
  }
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return 'This camera could not be opened. It may be in use by another app (Zoom, Teams, etc.), or the USB connection/driver failed—close other apps using the camera and try again.'
  }
  if (name === 'OverconstrainedError') {
    return 'This camera does not support the requested settings. Try another camera or refresh the page.'
  }
  if (name === 'SecurityError') {
    return 'Camera requires a secure (HTTPS) context or allowed permissions.'
  }
  if (name === 'AbortError') {
    return 'Opening the camera was cancelled. Try again.'
  }
  return 'Could not start this camera. Check permissions, USB connection, and that no other app is using it.'
}

function resolveMediaUrl(url) {
  if (!url) return null
  const s = String(url).trim()
  if (!s) return null
  if (/^https?:\/\//i.test(s) || s.startsWith('data:')) return s
  const base = String(API || '').replace(/\/+$/, '')
  const rel = s.startsWith('/') ? s : `/${s}`
  return `${base}${rel}`
}

const inputCls =
  'w-full min-h-[44px] rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-base sm:text-sm text-slate-800 placeholder:text-slate-300 focus:border-[#FEBF10] focus:ring-2 focus:ring-[#FEBF10]/25 outline-none transition-all'

/** Full-screen lightbox for previewing the chosen photo at full resolution */
function PhotoLightbox({ src, onClose }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20"
        aria-label="Close preview"
      >
        <X className="w-5 h-5" />
      </button>
      <img
        src={src}
        alt="Full-size preview"
        className="max-w-[90vw] max-h-[90vh] rounded-2xl shadow-sm object-contain"
        style={{ imageRendering: 'high-quality' }}
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  )
}

/**
 * Upload vs USB webcam capture — same behaviour as DOS Student registry "Register student identity" step 2.
 * FIXED: Preview is now large and high-quality. Upload sends the original file unchanged to the server.
 */
export default function StaffIdentityPhotoStep({ staff, accent = 'manager', onPhotoFileChange }) {
  const [photoTab, setPhotoTab] = useState('upload')
  const [uploadPreviewUrl, setUploadPreviewUrl] = useState(null)
  const [approvedPreviewUrl, setApprovedPreviewUrl] = useState(null)
  const [lightboxSrc, setLightboxSrc] = useState(null)

  const [cameraDevices, setCameraDevices] = useState([])
  const [cameraDeviceId, setCameraDeviceId] = useState('')
  const [cameraBusy, setCameraBusy] = useState(false)
  const [cameraError, setCameraError] = useState(null)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [pleasantFrame, setPleasantFrame] = useState(true)

  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const canvasRef = useRef(null)

  const existingUrl = resolveMediaUrl(staff?.photo || null)

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) videoRef.current.srcObject = null
  }, [])

  const startCamera = useCallback(
    async (deviceId) => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError('Camera is not supported in this browser.')
        return
      }
      setCameraError(null)
      setCameraBusy(true)
      try {
        stopCamera()
        const hdVideo = {
          width: { ideal: 1920, min: 640 },
          height: { ideal: 1080, min: 480 },
        }
        const constraints =
          deviceId && String(deviceId).trim()
            ? { video: { deviceId: { exact: String(deviceId).trim() }, ...hdVideo }, audio: false }
            : { video: { ...hdVideo, facingMode: { ideal: 'user' } }, audio: false }

        const stream = await navigator.mediaDevices.getUserMedia(constraints)
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play().catch(() => {})
        }
      } catch (e) {
        setCameraError(cameraStartErrorMessage(e))
      } finally {
        setCameraBusy(false)
      }
    },
    [stopCamera]
  )

  const detectCameras = useCallback(async () => {
    setCameraError(null)
    try {
      await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1920, min: 640 }, height: { ideal: 1080, min: 480 } },
        audio: false,
      })
      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoInputs = (devices || []).filter((d) => d.kind === 'videoinput')
      const normalized = videoInputs.map((d) => ({
        deviceId: d.deviceId,
        label: d.label ? d.label : 'Camera',
      }))
      setCameraDevices(normalized)

      const usbFirst =
        normalized.find((d) => /usb|webcam|external|camera/i.test(d.label)) ||
        normalized.find((d) => d.label && d.label.toLowerCase().includes('camera')) ||
        normalized[0] ||
        null
      setCameraDeviceId(usbFirst?.deviceId || '')
      return usbFirst?.deviceId || ''
    } catch {
      setCameraError('Camera detection failed. Check browser permissions and device connection.')
      return ''
    }
  }, [])

  const handleTakePhoto = useCallback(async () => {
    setCameraOpen(true)
    setCameraError(null)

    try {
      const deviceId = await detectCameras()
      await startCamera(deviceId || undefined)
    } catch {
      setCameraError('Cannot start camera. Please try again.')
    }
  }, [detectCameras, startCamera])

  const captureFromVideo = useCallback(() => {
    if (!videoRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!canvas) return

    const w = video.videoWidth || 640
    const h = video.videoHeight || 480
    canvas.width = w
    canvas.height = h

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.filter = pleasantFrame ? PLEASANT_FRAME_FILTER : 'none'
    ctx.drawImage(video, 0, 0, w, h)
    ctx.filter = 'none'

    canvas.toBlob(
      (blob) => {
        if (!blob) return
        const file = new File([blob], 'staff-profile.jpg', { type: 'image/jpeg' })
        onPhotoFileChange?.(file)

        setUploadPreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev)
          return null
        })
        const url = URL.createObjectURL(blob)
        setApprovedPreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev)
          return url
        })
        setCameraOpen(false)
        stopCamera()
      },
      'image/jpeg',
      0.97
    )
  }, [pleasantFrame, stopCamera, onPhotoFileChange])

  const handleUploadSelect = useCallback(
    (file) => {
      if (!file) return
      if (!file.type?.startsWith('image/')) return

      // ✅ FIX: Pass the ORIGINAL file to parent — no re-compression, no quality loss
      onPhotoFileChange?.(file)

      setApprovedPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return null
      })
      // Create blob URL from the original File for preview
      const url = URL.createObjectURL(file)
      setUploadPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return url
      })
    },
    [onPhotoFileChange]
  )

  const clearApproved = useCallback(() => {
    setUploadPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
    setApprovedPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
    setCameraOpen(false)
    stopCamera()
    onPhotoFileChange?.(null)
  }, [onPhotoFileChange, stopCamera])

  useEffect(() => {
    return () => { stopCamera() }
  }, [stopCamera])

  useEffect(() => {
    return () => {
      if (uploadPreviewUrl) URL.revokeObjectURL(uploadPreviewUrl)
      if (approvedPreviewUrl) URL.revokeObjectURL(approvedPreviewUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const cardActive = accent === 'dos' ? 'border-orange-400 bg-orange-50/80' : 'border-[#FEBF10] bg-[#FFF3CC]/80'
  const cardIdle = 'border-slate-200 bg-white hover:bg-slate-50'

  const previewSrc = uploadPreviewUrl || approvedPreviewUrl

  return (
    <div className="space-y-4">
      {/* Lightbox */}
      {lightboxSrc && <PhotoLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}

      <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900">Assign staff photo</p>
            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
              Upload from computer or capture using an external USB webcam / connected camera.
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-400/20 flex items-center justify-center shrink-0">
            <Camera className="w-5 h-5 text-slate-900" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
          <button
            type="button"
            onClick={() => setPhotoTab('upload')}
            className={`rounded-2xl border px-3 py-3 text-left touch-manipulation transition-all ${
              photoTab === 'upload' ? cardActive : cardIdle
            }`}
          >
            <div className="flex items-center gap-2">
              <Upload className="w-4 h-4 text-slate-600" />
              <p className="text-[13px] font-semibold text-slate-900">Upload image</p>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Choose a photo file from your device</p>
          </button>
          <button
            type="button"
            onClick={() => setPhotoTab('camera')}
            className={`rounded-2xl border px-3 py-3 text-left touch-manipulation transition-all ${
              photoTab === 'camera' ? cardActive : cardIdle
            }`}
          >
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4 text-slate-600" />
              <p className="text-[13px] font-semibold text-slate-900">Capture with camera</p>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Detect & preview external USB webcams</p>
          </button>
        </div>

        {/* Current photo */}
        <div className="rounded-2xl border border-[#FDEAA0]/70 bg-[#FFFBE8]/60 p-3 mb-3">
          <div className="flex items-start gap-3">
            <div className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
              {existingUrl ? (
                <img
                  src={existingUrl}
                  alt=""
                  className="w-full h-full object-cover"
                  style={{ imageRendering: 'high-quality' }}
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-slate-200" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-slate-900">Current photo</p>
              <p className="text-[11px] text-slate-600 mt-1">
                {existingUrl
                  ? 'Existing photo on file — upload or capture to replace it.'
                  : 'No photo saved yet. Add one to continue.'}
              </p>
            </div>
          </div>
        </div>

        {photoTab === 'upload' && (
          <div className="space-y-3">
            <label className="flex items-center justify-center gap-2 px-4 py-3 min-h-[48px] rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer touch-manipulation">
              <Upload className="w-4 h-4 text-slate-600" />
              <span className="text-sm font-semibold text-slate-800">Choose file</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleUploadSelect(e.target.files?.[0] || null)}
              />
            </label>

            {uploadPreviewUrl && (
              <div className="rounded-2xl border border-slate-200 bg-white p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">Preview</p>
                  <p className="text-[10px] text-slate-400">Original file — no quality loss on save</p>
                </div>
                {/* ✅ FIX: Large preview so quality is actually visible */}
                <div className="relative group">
                  <div
                    className="w-full rounded-2xl overflow-hidden bg-slate-100 border border-slate-200"
                    style={{ maxHeight: '320px' }}
                  >
                    <img
                      src={uploadPreviewUrl}
                      alt="Upload preview"
                      className="w-full h-full object-contain"
                      style={{
                        imageRendering: 'high-quality',
                        maxHeight: '320px',
                      }}
                    />
                  </div>
                  {/* Zoom button */}
                  <button
                    type="button"
                    onClick={() => setLightboxSrc(uploadPreviewUrl)}
                    className="absolute top-2 right-2 w-9 h-9 rounded-xl bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="View full size"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={clearApproved}
                  className="mt-2 px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-600 hover:bg-slate-50 touch-manipulation"
                >
                  Remove
                </button>
              </div>
            )}
          </div>
        )}

        {photoTab === 'camera' && (
          <div className="space-y-3">
            {!cameraOpen ? (
              <button
                type="button"
                onClick={handleTakePhoto}
                disabled={cameraBusy}
                className="w-full inline-flex items-center justify-center gap-2 min-h-[48px] rounded-2xl bg-amber-400 text-sm font-semibold text-slate-900 hover:bg-amber-300 disabled:opacity-60 transition-all touch-manipulation"
              >
                {cameraBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                Take photo
              </button>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
                {cameraError && (
                  <div className="mb-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                    {cameraError}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-4 items-stretch">
                  <div className="min-w-0 flex-1 sm:min-w-[58%]">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-2">Live preview</p>
                    <div className="relative w-full rounded-2xl overflow-hidden border-2 border-slate-200 bg-slate-900 shadow-inner aspect-video min-h-[220px] max-h-[min(72vh,520px)]">
                      <video
                        ref={videoRef}
                        playsInline
                        muted
                        className="absolute inset-0 w-full h-full object-cover"
                        style={{ filter: pleasantFrame ? PLEASANT_FRAME_FILTER : 'none' }}
                      />
                      {cameraBusy && (
                        <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10">
                          <Loader2 className="w-8 h-8 animate-spin text-[#B88A00]" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 w-full sm:w-[200px] md:w-[220px] shrink-0 sm:pt-7">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-2.5">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-2">Pleasant frame</p>
                      <p className="text-[10px] text-slate-500 mb-2 leading-snug">
                        Saturation + warmth. Matches your saved photo.
                      </p>
                      <div className="flex rounded-xl overflow-hidden border border-slate-200 bg-white">
                        <button
                          type="button"
                          onClick={() => setPleasantFrame(true)}
                          className={`flex-1 min-h-[40px] text-[11px] font-semibold px-2 transition-colors touch-manipulation ${
                            pleasantFrame ? 'bg-[#FEBF10] text-[#1A1200]' : 'bg-white text-slate-500 hover:bg-slate-50'
                          }`}
                        >
                          On
                        </button>
                        <button
                          type="button"
                          onClick={() => setPleasantFrame(false)}
                          className={`flex-1 min-h-[40px] text-[11px] font-semibold px-2 border-l border-slate-200 transition-colors touch-manipulation ${
                            !pleasantFrame ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'
                          }`}
                        >
                          Original
                        </button>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={captureFromVideo}
                      disabled={cameraBusy}
                      className="w-full min-h-[52px] rounded-2xl bg-[#FEBF10] text-[#1A1200] text-sm font-semibold hover:bg-[#FDEAA0] disabled:opacity-60 transition-all touch-manipulation shadow-md shadow-amber-500/20"
                    >
                      Capture
                    </button>
                    <button
                      type="button"
                      onClick={() => { setCameraOpen(false); stopCamera() }}
                      className="w-full min-h-[48px] rounded-2xl border border-slate-200 bg-white text-sm font-bold text-slate-600 hover:bg-slate-50 touch-manipulation"
                    >
                      Cancel
                    </button>
                    {cameraDevices.length > 0 && (
                      <div className="pt-1 border-t border-slate-100">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-1">Camera</p>
                        <select
                          value={cameraDeviceId}
                          onChange={(e) => setCameraDeviceId(e.target.value)}
                          className={inputCls}
                          style={{ minHeight: 44 }}
                        >
                          {cameraDevices.map((d) => (
                            <option key={d.deviceId} value={d.deviceId}>
                              {d.label}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => startCamera(cameraDeviceId || undefined)}
                          disabled={cameraBusy}
                          className="mt-2 w-full inline-flex items-center justify-center gap-2 min-h-[44px] rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-60 transition-all touch-manipulation"
                        >
                          <RotateCcw className="w-4 h-4" />
                          Switch
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {approvedPreviewUrl && photoTab === 'camera' && !cameraOpen && (
              <div className="rounded-2xl border border-slate-200 bg-white p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">Captured photo</p>
                  <p className="text-[10px] text-slate-400">JPEG 97% quality</p>
                </div>
                {/* ✅ FIX: Large preview for captured photo */}
                <div className="relative group mb-3">
                  <div
                    className="w-full rounded-2xl overflow-hidden bg-slate-100 border border-slate-200"
                    style={{ maxHeight: '320px' }}
                  >
                    <img
                      src={approvedPreviewUrl}
                      alt="Captured"
                      className="w-full h-full object-contain"
                      style={{
                        imageRendering: 'high-quality',
                        maxHeight: '320px',
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setLightboxSrc(approvedPreviewUrl)}
                    className="absolute top-2 right-2 w-9 h-9 rounded-xl bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="View full size"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-slate-600 font-semibold mb-2">Confirm the photo. You can retake if it&apos;s not clear.</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={clearApproved}
                    className="flex-1 min-h-[44px] rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-600 hover:bg-slate-50 touch-manipulation"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={handleTakePhoto}
                    disabled={cameraBusy}
                    className="flex-1 min-h-[44px] rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-60 touch-manipulation"
                  >
                    Retake
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900">Ready to continue</p>
            <p className="text-[11px] text-slate-500 mt-1">Save the photo, then continue to RFID and fingerprint.</p>
          </div>
          <p className={`text-[10px] font-bold ${accent === 'dos' ? 'text-orange-700' : 'text-[#1E3A5F]'}`}>
            {uploadPreviewUrl || approvedPreviewUrl ? 'New image ready to save.' : 'Choose upload or capture above.'}
          </p>
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" aria-hidden />
    </div>
  )
}