import { describe, expect, it } from 'vitest'
import { toCsv } from './csv'

describe('toCsv', () => {
  it('returns an empty string for no rows', () => {
    expect(toCsv([])).toBe('')
  })

  it('builds a header row from the first row keys', () => {
    const csv = toCsv([{ model: 'lenet5', accuracy: 0.98 }])
    expect(csv).toBe('model,accuracy\nlenet5,0.98')
  })

  it('joins multiple rows with newlines', () => {
    const csv = toCsv([
      { model: 'lenet5', accuracy: 0.98 },
      { model: 'alexnet', accuracy: 0.95 },
    ])
    expect(csv).toBe('model,accuracy\nlenet5,0.98\nalexnet,0.95')
  })

  it('quotes values containing commas, quotes or newlines', () => {
    const csv = toCsv([{ note: 'contains, a comma' }])
    expect(csv).toBe('note\n"contains, a comma"')
  })

  it('escapes embedded double quotes by doubling them', () => {
    const csv = toCsv([{ note: 'said "hello"' }])
    expect(csv).toBe('note\n"said ""hello"""')
  })

  it('renders null and undefined values as empty strings', () => {
    const csv = toCsv([{ note: null, other: undefined }])
    expect(csv).toBe('note,other\n,')
  })
})
