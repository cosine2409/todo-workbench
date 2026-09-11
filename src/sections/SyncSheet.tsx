import { useEffect, useState } from 'react'
import type { SyncStatus } from '@/hooks/useTasks'
import { X, Cloud, CloudOff, Copy, Check, RefreshCw, LogOut } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  space: string | null
  status: SyncStatus
  lastSyncAt: number | null
  onCreateSpace: () => string
  onJoinSpace: (code: string) => void
  onLeaveSpace: () => void
  onSyncNow: () => void
}

const STATUS_TEXT: Record<SyncStatus, { label: string; cls: string }> = {
  off: { label: '未连接', cls: 'text-gray-400' },
  idle: { label: '已同步', cls: 'text-emerald-600' },
  syncing: { label: '同步中…', cls: 'text-blue-500' },
  error: { label: '同步失败（稍后自动重试）', cls: 'text-red-500' },
}

export default function SyncSheet({ open, onClose, space, status, lastSyncAt, onCreateSpace, onJoinSpace, onLeaveSpace, onSyncNow }: Props) {
  const [code, setCode] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (open) {
      setCode('')
      setCopied(false)
    }
  }, [open])

  if (!open) return null

  const st = STATUS_TEXT[status]

  const copy = async () => {
    if (!space) return
    try {
      await navigator.clipboard.writeText(space)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = space
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl px-5 pt-4 pb-8 max-w-lg mx-auto shadow-2xl">
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            {space ? <Cloud className="w-5 h-5 text-emerald-500" /> : <CloudOff className="w-5 h-5 text-gray-300" />}
            云端同步
          </h2>
          <button onClick={onClose} className="p-1.5 text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {space ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3.5">
              <div className="text-xs text-gray-500 mb-1">当前同步码（其他设备输入同一个码即可共享数据）</div>
              <div className="flex items-center justify-between">
                <span className="text-xl font-bold tracking-wider text-gray-900">{space}</span>
                <button
                  onClick={copy}
                  className="flex items-center gap-1 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-full px-3 py-1.5 active:bg-gray-50"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? '已复制' : '复制'}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className={`font-medium ${st.cls}`}>● {st.label}</span>
              <span className="text-xs text-gray-400">
                {lastSyncAt ? `上次 ${new Date(lastSyncAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}` : ''}
              </span>
            </div>

            <div className="flex gap-2.5">
              <button
                onClick={onSyncNow}
                className="flex-1 py-3 rounded-2xl bg-gray-900 text-white text-[15px] font-semibold flex items-center justify-center gap-1.5 active:bg-gray-700"
              >
                <RefreshCw className="w-4 h-4" /> 立即同步
              </button>
              <button
                onClick={onLeaveSpace}
                className="px-4 py-3 rounded-2xl bg-gray-100 text-gray-500 text-[15px] font-semibold flex items-center gap-1.5 active:bg-gray-200"
              >
                <LogOut className="w-4 h-4" /> 断开
              </button>
            </div>

            <div className="text-[11px] text-gray-400 leading-relaxed">
              改动会自动上传，打开应用或每 30 秒自动拉取最新数据。同步码即数据钥匙，请勿分享给无关人员。
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-sm text-gray-500 leading-relaxed">
              目前数据只保存在本机浏览器。开启云端同步后，手机、电脑、平板共用同一份数据，改动自动互通。
            </div>

            <button
              onClick={() => onCreateSpace()}
              className="w-full py-3.5 rounded-2xl bg-gray-900 text-white text-[15px] font-semibold active:bg-gray-700"
            >
              ☁️ 创建我的同步空间
            </button>
            <div className="text-center text-[11px] text-gray-400">本机数据将上传为新空间的初始数据，并生成一个同步码</div>

            <div className="flex items-center gap-2 text-xs text-gray-300">
              <div className="flex-1 h-px bg-gray-100" />
              或者加入已有空间
              <div className="flex-1 h-px bg-gray-100" />
            </div>

            <div className="flex gap-2">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="输入同步码，如 wuma-k7p2x9"
                className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-[15px] outline-none focus:border-gray-400"
              />
              <button
                onClick={() => code.trim() && onJoinSpace(code)}
                disabled={!code.trim()}
                className={`px-4 py-2.5 rounded-xl text-[15px] font-semibold ${
                  code.trim() ? 'bg-gray-900 text-white active:bg-gray-700' : 'bg-gray-100 text-gray-300'
                }`}
              >
                加入
              </button>
            </div>
            <div className="text-[11px] text-gray-400">加入后若云端数据比本机新，将以云端为准覆盖本机数据</div>
          </div>
        )}
      </div>
    </div>
  )
}
