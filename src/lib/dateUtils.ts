/** 日期工具：全部使用本地日期，格式 YYYY-MM-DD */

export function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`
}

export function fmt(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function todayStr(): string {
  return fmt(new Date())
}

export function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(s: string, n: number): string {
  const d = parseDate(s)
  d.setDate(d.getDate() + n)
  return fmt(d)
}

/** 两个日期串相差天数（b - a） */
export function diffDays(a: string, b: string): number {
  return Math.round((parseDate(b).getTime() - parseDate(a).getTime()) / 86400000)
}

export function weekdayCN(s: string): string {
  return ['日', '一', '二', '三', '四', '五', '六'][parseDate(s).getDay()]
}

export function mdLabel(s: string): string {
  const [, m, d] = s.split('-')
  return `${Number(m)}月${Number(d)}日`
}

/** 判断某天是否处于任务周期内 */
export function inRange(day: string, start: string, end: string): boolean {
  return day >= start && day <= end
}
