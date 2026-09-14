import { useEffect, useMemo, useRef, useState } from 'react'
import { parseTaskInput } from '@/lib/nlp'
import { todayStr } from '@/lib/dateUtils'
import { Mic, MicOff, X, Sparkles } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  onAdd: (t: {
    title: string
    project: string
    startDate: string
    endDate: string
    timeHint?: string
    urgent: boolean
  }) => void
}

declare global {
  interface Window {
    SpeechRecognition?: any
    webkitSpeechRecognition?: any
  }
}

export default function AddTaskSheet({ open, onClose, onAdd }: Props) {
  const [text, setText] = useState('')
  const [listening, setListening] = useState(false)
  const [voiceSupported, setVoiceSupported] = useState(true)
  const [voiceError, setVoiceError] = useState<'network' | 'denied' | 'nospeech' | 'other' | null>(null)
  const recogRef = useRef<any>(null)

  const parsed = useMemo(() => (text.trim() ? parseTaskInput(text) : null), [text])

  useEffect(() => {
    if (open) {
      setText('')
      setListening(false)
      setVoiceError(null)
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition
      setVoiceSupported(!!SR)
    }
  }, [open])

  useEffect(() => {
    return () => {
      try {
        recogRef.current?.stop()
      } catch {
        /* ignore */
      }
    }
  }, [])

  const toggleVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) {
      setVoiceSupported(false)
      return
    }
    if (listening) {
      recogRef.current?.stop()
      setListening(false)
      return
    }
    setVoiceError(null)
    const r = new SR()
    r.lang = 'zh-CN'
    r.continuous = true
    r.interimResults = true
    r.onresult = (e: any) => {
      let final = ''
      for (let i = 0; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript
      }
      if (final) setText((prev) => (prev ? prev + '，' : '') + final)
    }
    r.onerror = (e: any) => {
      setListening(false)
      const err = e?.error || ''
      if (err === 'network') setVoiceError('network')
      else if (err === 'not-allowed' || err === 'service-not-allowed') setVoiceError('denied')
      else if (err === 'no-speech') setVoiceError('nospeech')
      else if (err) setVoiceError('other')
    }
    r.onend = () => setListening(false)
    recogRef.current = r
    try {
      r.start()
      setListening(true)
    } catch {
      setListening(false)
      setVoiceError('other')
    }
  }

  const submit = () => {
    if (!parsed) return
    onAdd({
      title: parsed.title,
      project: parsed.project || '日常',
      startDate: parsed.startDate,
      endDate: parsed.endDate,
      timeHint: parsed.timeHint,
      urgent: parsed.urgent,
    })
    setText('')
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl px-5 pt-4 pb-8 max-w-lg mx-auto shadow-2xl">
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-gray-900">新建事项</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="text-xs text-gray-400 mb-2 flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5" />
          试试模糊输入：「官网设计稿 15到18号做脚本 20号拍摄，特别紧急」
        </div>

        <div className="relative">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="输入或语音说出事项，自动识别时间、阶段和紧急程度…"
            rows={3}
            className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 pr-14 text-[15px] outline-none focus:border-gray-400 resize-none"
            autoFocus
          />
          <button
            onClick={toggleVoice}
            className={`absolute right-3 bottom-3 p-2.5 rounded-full transition-colors ${
              listening ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-900 text-white active:scale-95'
            }`}
            aria-label="语音输入"
          >
            {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
        </div>
        {listening && <div className="text-xs text-red-500 mt-1.5">🎙 正在聆听，说完自动识别…</div>}

        {/* 语音不可用/失败时的分级指引 */}
        {!voiceSupported && (
          <div className="mt-1.5 rounded-xl bg-amber-50 border border-amber-100 px-3 py-2 text-xs text-amber-700 leading-relaxed">
            当前浏览器不支持语音识别（iPhone 的 Safari 暂不支持）。可直接用<strong>键盘自带的语音输入</strong>：聚焦输入框后点键盘上的麦克风键说话即可。
          </div>
        )}
        {voiceError === 'network' && (
          <div className="mt-1.5 rounded-xl bg-amber-50 border border-amber-100 px-3 py-2 text-xs text-amber-700 leading-relaxed">
            语音识别服务连不上（Chrome 的识别走 Google 服务器，国内网络不可用）。解决办法：① 电脑换 <strong>Edge 浏览器</strong>（走微软服务器，国内可用）；② 直接用手机<strong>键盘自带的语音输入</strong>。
          </div>
        )}
        {voiceError === 'denied' && (
          <div className="mt-1.5 rounded-xl bg-amber-50 border border-amber-100 px-3 py-2 text-xs text-amber-700 leading-relaxed">
            没有麦克风权限。请点浏览器地址栏左侧的锁形图标，允许麦克风后重试。
          </div>
        )}
        {voiceError === 'nospeech' && (
          <div className="text-xs text-amber-500 mt-1.5">没听清，请靠近麦克风再说一次</div>
        )}
        {voiceError === 'other' && (
          <div className="text-xs text-amber-500 mt-1.5">语音识别启动失败，可改用键盘自带的语音输入</div>
        )}

        {parsed && (
          <div className="mt-3 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
            <div className="text-[15px] font-medium text-gray-800">{parsed.title}</div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {parsed.chips.map((c, i) => (
                <span key={i} className="text-xs bg-white border border-gray-200 rounded-full px-2.5 py-1 text-gray-600">
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={submit}
          disabled={!parsed}
          className={`mt-4 w-full py-3.5 rounded-2xl text-[15px] font-semibold transition-colors ${
            parsed ? 'bg-gray-900 text-white active:bg-gray-700' : 'bg-gray-100 text-gray-300'
          }`}
        >
          保存事项
        </button>
        <div className="mt-2 text-center text-[11px] text-gray-300">
          提示：未识别日期时默认为今天（{todayStr().slice(5).replace('-', '月')}日）
        </div>
      </div>
    </div>
  )
}
