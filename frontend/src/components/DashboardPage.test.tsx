import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DashboardPage } from './DashboardPage'

const { listExperiments, deleteExperiment } = vi.hoisted(() => ({
  listExperiments: vi.fn(),
  deleteExperiment: vi.fn(),
}))

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client')
  return { ...actual, listExperiments, deleteExperiment }
})

const EXPERIMENTS = [
  {
    id: 1,
    model: 'lenet5' as const,
    dataset: 'mnist' as const,
    test_accuracy: 0.9842,
    created_at: '2026-07-01T12:00:00Z',
    note: null,
  },
  {
    id: 2,
    model: 'resnet18' as const,
    dataset: 'cifar10' as const,
    test_accuracy: 0.8123,
    created_at: '2026-07-05T09:30:00Z',
    note: null,
  },
]

function renderDashboard() {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Routes>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/dashboard/compare-selected" element={<div>Compare selected page</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('DashboardPage', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders the list of experiments once loaded', async () => {
    listExperiments.mockResolvedValue(EXPERIMENTS)

    renderDashboard()

    expect(await screen.findByText('LeNet-5')).toBeInTheDocument()
    expect(screen.getByText('ResNet18')).toBeInTheDocument()
    expect(screen.getByText('98.42%')).toBeInTheDocument()
  })

  it('shows the empty state when there are no experiments', async () => {
    listExperiments.mockResolvedValue([])

    renderDashboard()

    expect(await screen.findByText('No experiments yet. Train your first model to get started.')).toBeInTheDocument()
  })

  it('removes an experiment from the list after deleting it', async () => {
    const user = userEvent.setup()
    listExperiments.mockResolvedValue(EXPERIMENTS)
    deleteExperiment.mockResolvedValue(undefined)

    renderDashboard()
    await screen.findByText('LeNet-5')

    const card = screen.getByText('LeNet-5').closest('li')!
    await user.click(within(card).getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(screen.queryByText('LeNet-5')).not.toBeInTheDocument())
    expect(deleteExperiment).toHaveBeenCalledWith(1)
  })

  it('navigates to the compare-selected page with the chosen experiment ids', async () => {
    const user = userEvent.setup()
    listExperiments.mockResolvedValue(EXPERIMENTS)

    renderDashboard()
    await screen.findByText('LeNet-5')

    const checkboxes = screen.getAllByRole('checkbox')
    // checkboxes[0] is the "select all" header checkbox; experiment rows start at index 1
    await user.click(checkboxes[1])
    await user.click(checkboxes[2])

    await user.click(screen.getByRole('button', { name: 'Compare selected (2)' }))

    expect(await screen.findByText('Compare selected page')).toBeInTheDocument()
  })
})
