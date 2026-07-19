const experiments = [
  {
    id: 1,
    model: 'lenet5',
    dataset: 'mnist',
    test_accuracy: 0.9842,
    created_at: '2026-07-01T12:00:00Z',
    note: 'baseline run',
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

describe('dashboard', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('redirects unauthenticated visitors to the landing page', () => {
    cy.visit('/dashboard')
    cy.url().should('eq', `${Cypress.config().baseUrl}/`)
  })

  it('lists experiments for an authenticated user', () => {
    cy.intercept('GET', '/experiments', { statusCode: 200, body: experiments }).as('listExperiments')

    cy.loginByToken()
    cy.visit('/dashboard')
    cy.wait('@listExperiments')

    cy.contains('.experiment-card', 'LeNet-5').within(() => {
      cy.contains('MNIST')
      cy.contains('98.42%')
    })
    cy.contains('.experiment-card', 'ResNet18').within(() => {
      cy.contains('CIFAR-10')
      cy.contains('81.23%')
    })
  })

  it('shows an empty state when there are no experiments', () => {
    cy.intercept('GET', '/experiments', { statusCode: 200, body: [] }).as('listExperiments')

    cy.loginByToken()
    cy.visit('/dashboard')
    cy.wait('@listExperiments')

    cy.contains('No experiments yet. Train your first model to get started.')
  })

  it('deletes an experiment from the list', () => {
    cy.intercept('GET', '/experiments', { statusCode: 200, body: experiments }).as('listExperiments')
    cy.intercept('DELETE', '/experiments/1', { statusCode: 204 }).as('deleteExperiment')

    cy.loginByToken()
    cy.visit('/dashboard')
    cy.wait('@listExperiments')

    cy.contains('.experiment-card', 'LeNet-5').contains('button', 'Delete').click()
    cy.wait('@deleteExperiment')

    cy.contains('LeNet-5').should('not.exist')
    cy.contains('.experiment-card', 'ResNet18')
  })

  it('navigates to an experiment detail page', () => {
    cy.intercept('GET', '/experiments', { statusCode: 200, body: experiments }).as('listExperiments')

    cy.loginByToken()
    cy.visit('/dashboard')
    cy.wait('@listExperiments')

    cy.contains('.experiment-card', 'LeNet-5').click()
    cy.url().should('include', '/dashboard/experiments/1')
  })
})
