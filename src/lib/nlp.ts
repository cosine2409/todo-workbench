import { addDays, fmt, parseDate, todayStr } from './dateUtils'

export interface ParsedInput {
  title: string
  project?: string
  startDate: string
  endDate: string
  timeHint?: string
  urgent: boolean
  /** 解析出的片段说明，用于界面预览 */
  chips: string[]
}

const CN_NUM: Record<string, number> = {
  一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10,
}

function cnToNum(s: string): number {
  if (/^\d+$/.test(s)) return Number(s)
  if (s === '十') return 10
  if (s.startsWith('十')) return 10 + (CN_NUM[s[1]] ?? 0)
  if (s.includes('十')) {
    const [a, b] = s.split('十')
    return (CN_NUM[a] ?? 1) * 10 + (CN_NUM[b] ?? 0)
  }
  return CN_NUM[s] ?? 0
}

/** 解析"周X/星期X"，target=1..7（7=周日），返回最近的那个日期（可选下周） */
function nextWeekday(target: number, nextWeek: boolean): string {
  const today = parseDate(todayStr())
  const cur = today.getDay() === 0 ? 7 : today.getDay()
  let delta = target - cur
  if (delta <= 0) delta += 7
  if (nextWeek) delta += 7
  today.setDate(today.getDate() + delta)
  return fmt(today)
}

/** 推断 MM-DD 的年份：已过去则取明年 */
function inferYear(month: number, day: number): Date {
  const now = new Date()
  let d = new Date(now.getFullYear(), month - 1, day)
  if (fmt(d) < todayStr()) d = new Date(now.getFullYear() + 1, month - 1, day)
  return d
}

export function parseTaskInput(raw: string): ParsedInput {
  let text = ` ${raw.trim()} `
  const chips: string[] = []
  let urgent = false
  let project: string | undefined
  let timeHint: string | undefined
  let startDate: string | undefined
  let endDate: string | undefined
  let durationDays: number | undefined

  // 1. 紧急程度
  if (/(特别紧急|非常紧急|十分紧急|超级紧急|很紧急|紧急|加急|火急|尽快|马上|立即|asap)/i.test(text)) {
    urgent = true
    text = text.replace(/(特别紧急|非常紧急|十分紧急|超级紧急|很紧急|紧急|加急|火急|尽快|马上|立即|asap)[，,。!！]*/gi, ' ')
    chips.push('🔴 特别紧急')
  }

  // 2. 项目名：【项目】《项目》#项目 或 “xx项目”
  const pm = text.match(/【(.{1,20}?)】|《(.{1,20}?)》|#([^\s#，,。]{1,20})|([\u4e00-\u9fa5A-Za-z0-9]{1,12}?项目)/)
  if (pm) {
    project = (pm[1] || pm[2] || pm[3] || pm[4] || '').replace(/项目$/, '项目')
    if (pm[1] || pm[2] || pm[3]) project = project.replace(/项目$/, '') + ''
    text = text.replace(pm[0], ' ')
  }

  // 3. 时间点：下午3点 / 15:30 / 晚上8点半 / 中午12点
  const tm = text.match(/(凌晨|早上|早晨|上午|中午|下午|傍晚|晚上|今晚|今晚)?\s*(\d{1,2})(?:[:：](\d{1,2})|点(半)?)/)
  if (tm) {
    let h = Number(tm[2])
    const min = tm[3] ? Number(tm[3]) : tm[4] ? 30 : 0
    const period = tm[1] || ''
    if ((/下午|傍晚|晚上|今晚/.test(period)) && h < 12) h += 12
    if (/中午/.test(period) && h < 12) h = h === 12 ? 12 : h + 12
    if (/凌晨/.test(period) && h === 12) h = 0
    if (h <= 23 && min <= 59) {
      timeHint = `${h < 10 ? '0' + h : h}:${min < 10 ? '0' + min : min}`
      text = text.replace(tm[0], ' ')
      chips.push(`⏰ ${timeHint}`)
    }
  }

  // 4. 持续时长：持续3天 / 为期一周 / 3天完成 / 需要两周
  const dm = text.match(/(持续|为期|需要|预计|大概|大约)?\s*(\d+|[一二两三四五六七八九十]+)\s*(个)?(天|日|周|星期|个月)(?:内)?(?:完成|搞定|做完|交付)?/)
  if (dm && /持续|为期|需要|预计|大概|完成|搞定|做完|交付/.test(dm[0])) {
    const n = cnToNum(dm[2])
    const unit = dm[4]
    durationDays = unit === '天' || unit === '日' ? n : unit === '个月' ? n * 30 : n * 7
    text = text.replace(dm[0], ' ')
  }

  // 5. 明确日期：8月15日 / 8月15号 / 8-15 / 8/15
  const explicit: string[] = []
  text = text.replace(/(\d{1,2})\s*月\s*(\d{1,2})\s*[日号]?/g, (_, m, d) => {
    explicit.push(fmt(inferYear(Number(m), Number(d))))
    return ' '
  })
  if (explicit.length === 0) {
    text = text.replace(/(?<![\d/:：-])(\d{1,2})[-/.](\d{1,2})(?![\d/-])/g, (_, m, d) => {
      explicit.push(fmt(inferYear(Number(m), Number(d))))
      return ' '
    })
  }

  // 6. 相对日期
  const rel = (s: string) => {
    const t = todayStr()
    if (/大后天/.test(s)) return addDays(t, 3)
    if (/后天/.test(s)) return addDays(t, 2)
    if (/明天|明日/.test(s)) return addDays(t, 1)
    if (/今天|今日|今晚/.test(s)) return t
    return undefined
  }
  const relM = text.match(/大后天|后天|明天|明日|今天|今日|今晚/)
  if (relM && explicit.length === 0) {
    explicit.push(rel(relM[0])!)
    text = text.replace(relM[0], ' ')
  }

  // X天后 / X周后（截止时间）
  const afterM = text.match(/(\d+|[一二两三四五六七八九十]+)\s*(个)?(天|日|周|星期)后/)
  if (afterM && explicit.length === 0) {
    const n = cnToNum(afterM[1])
    const days = /天|日/.test(afterM[3]) ? n : n * 7
    explicit.push(addDays(todayStr(), days))
    text = text.replace(afterM[0], ' ')
  }

  // 下周X / 下下周X / 周X / 星期X / 礼拜X
  const wM = text.match(/(下下周|下周|本周|这周|周|星期|礼拜)\s*([一二三四五六日天1-7])?/)
  if (wM && explicit.length === 0) {
    const map: Record<string, number> = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 日: 7, 天: 7, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7 }
    const target = wM[2] ? map[wM[2]] : 5 // 未说明默认周五
    const nextWeek = /下周|下下周/.test(wM[1])
    explicit.push(nextWeekday(target, nextWeek))
    if (/下下周/.test(wM[1])) {
      const d = parseDate(explicit.pop()!)
      d.setDate(d.getDate() + 7)
      explicit.push(fmt(d))
    }
    text = text.replace(wM[0], ' ')
  }

  if (/月底|月末/.test(text) && explicit.length === 0) {
    const now = new Date()
    explicit.push(fmt(new Date(now.getFullYear(), now.getMonth() + 1, 0)))
    text = text.replace(/月底|月末/, ' ')
  }
  if (/周末/.test(text) && explicit.length === 0) {
    explicit.push(nextWeekday(6, false))
    text = text.replace(/周末/, ' ')
  }

  // 7. 日期归位：两个明确日期 → 早开始晚结束；一个 → 结束日
  explicit.sort()
  if (explicit.length >= 2) {
    startDate = explicit[0]
    endDate = explicit[explicit.length - 1]
  } else if (explicit.length === 1) {
    endDate = explicit[0]
  }
  if (durationDays) {
    const base = startDate ?? todayStr()
    startDate = base
    const durEnd = addDays(base, durationDays - 1)
    endDate = endDate && endDate > durEnd ? endDate : durEnd
    chips.push(`📅 ${durationDays} 天周期`)
  }
  if (!startDate) startDate = todayStr()
  if (!endDate) endDate = startDate

  if (endDate > startDate || endDate === startDate) {
    const label = startDate === endDate ? `节点 ${endDate.slice(5)}` : `${startDate.slice(5)} → ${endDate.slice(5)}`
    chips.push(`🗓 ${label}`)
  }

  // 8. 清理标题：去掉解析残留的虚词
  let title = text
    .replace(/(截止|截至|截至到|之前|前|deadline|完成|交付|提交|需要|要|得|记得|提醒我)/gi, ' ')
    .replace(/[，,。!！?？、；;：:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!title) title = raw.trim()

  return { title, project, startDate, endDate, timeHint, urgent, chips }
}
