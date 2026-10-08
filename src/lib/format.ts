export const money = (n: number, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(n)

export const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

export const dateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

export const fullDateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  })

export const relative = (iso: string, now = Date.now()) => {
  const diff = new Date(iso).getTime() - now
  const abs = Math.abs(diff)
  const m = Math.round(abs / 60000)
  const h = Math.round(abs / 3600000)
  const d = Math.round(abs / 86400000)
  let s: string
  if (m < 1) s = 'just now'
  else if (m < 60) s = `${m}m`
  else if (h < 48) s = `${h}h`
  else s = `${d}d`
  if (s === 'just now') return s
  return diff < 0 ? `${s} ago` : `in ${s}`
}

export const titleCase = (s: string) =>
  s
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')

export const initials = (name: string) =>
  name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

export const uid = (prefix: string) =>
  `${prefix}_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`

// Snapshot of the current time per render tree, so render stays pure.
import { useState } from 'react'
export const useNow = () => useState(() => Date.now())[0]
