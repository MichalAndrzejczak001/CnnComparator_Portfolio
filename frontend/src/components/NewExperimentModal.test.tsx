import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/client'
import { NewExperimentModal } from './NewExperimentModal'

const { createExperiment } = vi.hoisted(() => ({
  createExperiment: vi.fn(),
}))

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client')
  return { ...actual, createExperiment }
})

describe('NewExperimentModal', () => {
  it('submits the form with the selected training configuration', async () => {
    const user = userEvent.setup()
    createExperiment.mockResolvedValue({ id: 1 })
    const onCreated = vi.fn()

    render(<NewExperimentModal onClose={vi.fn()} onCreated={onCreated} />)

    await user.selectOptions(screen.getByLabelText('Model'), 'resnet18')
    await user.selectOptions(screen.getByLabelText('Dataset'), 'cifar10')
    await user.clear(screen.getByLabelText('Epochs'))
    await user.type(screen.getByLabelText('Epochs'), '3')
    await user.type(screen.getByLabelText('Note (optional)'), 'quick test')
    await user.click(screen.getByRole('button', { name: 'Start training' }))

    await waitFor(() => expect(onCreated).toHaveBeenCalled())

    expect(createExperiment).toHaveBeenCalledWith({
      model: 'resnet18',
      dataset: 'cifar10',
      training: { epochs: 3, batch_size: 64, learning_rate: 0.001 },
      note: 'quick test',
    })
  })

  it('shows the server error message when training fails', async () => {
    const user = userEvent.setup()
    createExperiment.mockRejectedValue(new ApiError(400, 'Unknown model: resnet18'))

    render(<NewExperimentModal onClose={vi.fn()} onCreated={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: 'Start training' }))

    expect(await screen.findByText('Unknown model: resnet18')).toBeInTheDocument()
  })

  it('calls onClose when the close button is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()

    render(<NewExperimentModal onClose={onClose} onCreated={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: 'Close' }))

    expect(onClose).toHaveBeenCalled()
  })

  it('disables the submit button while the request is in flight', async () => {
    const user = userEvent.setup()
    let resolveCreate!: (value: unknown) => void
    createExperiment.mockReturnValue(new Promise((resolve) => (resolveCreate = resolve)))

    render(<NewExperimentModal onClose={vi.fn()} onCreated={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: 'Start training' }))

    expect(screen.getByRole('button', { name: /Training…/ })).toBeDisabled()

    resolveCreate({ id: 1 })
  })
})
