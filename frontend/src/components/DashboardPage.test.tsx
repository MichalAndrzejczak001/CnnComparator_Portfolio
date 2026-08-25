import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DashboardPage } from './DashboardPage'
import type { ExperimentSummaryResponse, PageResponse } from '../types/api'
import type { ListExperimentsParams } from '../api/client'

const { listExperiments, deleteExperiment } = vi.hoisted(() => ({
  listExperiments: vi.fn(),
  deleteExperiment: vi.fn(),
}))

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client')
  return { ...actual, listExperiments, deleteExperiment }
})

const EXPERIMENTS: ExperimentSummaryResponse[] = [
  {
    id: 1,
    model: 'lenet5',
    dataset: 'mnist',
    test_accuracy: 0.9842,
    created_at: '2026-07-01T12:00:00Z',
    note: null,
  },
  {
    id: 2,
    model: 'resnet18',
    dataset: 'cifar10',
    test_accuracy: 0.8123,
    created_at: '2026-07-05T09:30:00Z',
    note: null,
  },
]

function toPage(content: ExperimentSummaryResponse[]): PageResponse<ExperimentSummaryResponse> {
  return {
    content,
    page: 0,
    size: 20,
    total_elements: content.length,
    total_pages: content.length === 0 ? 0 : 1,
    last: true,
  }
}

function renderDashboard(initialEntry = '/dashboard') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
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
    listExperiments.mockResolvedValue(toPage(EXPERIMENTS))

    renderDashboard()

    expect(await screen.findByText('LeNet-5')).toBeInTheDocument()
    expect(screen.getByText('ResNet18')).toBeInTheDocument()
    expect(screen.getByText('98.42%')).toBeInTheDocument()
  })

  it('shows the empty state when there are no experiments', async () => {
    listExperiments.mockResolvedValue(toPage([]))

    renderDashboard()

    expect(await screen.findByText('No experiments yet. Train your first model to get started.')).toBeInTheDocument()
  })

  it('removes an experiment from the list after deleting it', async () => {
    const user = userEvent.setup()
    listExperiments.mockResolvedValue(toPage(EXPERIMENTS))
    deleteExperiment.mockResolvedValue(undefined)

    renderDashboard()
    await screen.findByText('LeNet-5')

    listExperiments.mockResolvedValue(toPage(EXPERIMENTS.filter((e) => e.id !== 1)))

    const card = screen.getByText('LeNet-5').closest('li')!
    await user.click(within(card).getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(screen.queryByText('LeNet-5')).not.toBeInTheDocument())
    expect(deleteExperiment).toHaveBeenCalledWith(1)
  })

  it('navigates to the compare-selected page with the chosen experiment ids', async () => {
    const user = userEvent.setup()
    listExperiments.mockResolvedValue(toPage(EXPERIMENTS))

    renderDashboard()
    await screen.findByText('LeNet-5')

    const checkboxes = screen.getAllByRole('checkbox')
    // checkboxes[0] is the "select all" header checkbox; experiment rows start at index 1
    await user.click(checkboxes[1])
    await user.click(checkboxes[2])

    await user.click(screen.getByRole('button', { name: 'Compare selected (2)' }))

    expect(await screen.findByText('Compare selected page')).toBeInTheDocument()
  })

  it('narrows the list to a single model when a model filter is in the URL', async () => {
    listExperiments.mockImplementation((params: ListExperimentsParams = {}) =>
      Promise.resolve(toPage(EXPERIMENTS.filter((e) => !params.model || e.model === params.model))),
    )

    renderDashboard('/dashboard?model=lenet5')

    expect(await screen.findByText('LeNet-5')).toBeInTheDocument()
    expect(screen.queryByText('ResNet18')).not.toBeInTheDocument()
    expect(screen.getByText('Filtered by')).toBeInTheDocument()
    expect(listExperiments).toHaveBeenCalledWith(expect.objectContaining({ model: 'lenet5' }))
  })

  it('shows a no-match message when the filter matches no experiments', async () => {
    listExperiments.mockImplementation((params: ListExperimentsParams = {}) =>
      Promise.resolve(toPage(EXPERIMENTS.filter((e) => !params.model || e.model === params.model))),
    )

    renderDashboard('/dashboard?model=vgg11')

    expect(await screen.findByText('No experiments match this filter.')).toBeInTheDocument()
  })
})
