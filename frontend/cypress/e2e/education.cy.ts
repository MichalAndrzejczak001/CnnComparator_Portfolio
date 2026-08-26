describe('models and datasets pages', () => {
  beforeEach(() => {
    window.localStorage.clear()
    cy.intercept(
      { method: 'GET', pathname: '/experiments' },
      { statusCode: 200, body: { content: [], page: 0, size: 20, total_elements: 0, total_pages: 0, last: true } },
    ).as('listExperiments')
    cy.loginByToken()
  })

  it('shows the layer diagram and specs for every architecture', () => {
    cy.visit('/dashboard/models')
    cy.contains('h1', 'About the models')

    cy.contains('.model-card', 'SimpleCNN').within(() => {
      cy.contains('.layer-block-label', 'FC 128')
    })
    cy.contains('.model-card', 'LeNet-5').within(() => {
      cy.contains('Published: 1998')
    })
    cy.contains('.model-card', 'ResNet18').within(() => {
      cy.contains('.layer-block-label', 'ResBlock×2')
    })
    cy.contains('.model-legend', 'Legend:')
  })

  it('shows sample images and the comparison table for every dataset', () => {
    cy.visit('/dashboard/datasets')
    cy.contains('h1', 'About the datasets')

    cy.contains('.dataset-card', 'MNIST').within(() => {
      cy.contains('digit 7')
    })
    cy.contains('.dataset-card', 'Fashion-MNIST').within(() => {
      cy.contains('sneaker')
    })
    cy.contains('.dataset-card', 'CIFAR-10').within(() => {
      cy.contains('frog')
    })
    cy.contains('.data-table', 'Difficulty')
  })

  it('links to both pages from the top navigation', () => {
    cy.visit('/dashboard')
    cy.contains('nav a', 'Models').click()
    cy.url().should('include', '/dashboard/models')

    cy.contains('nav a', 'Datasets').click()
    cy.url().should('include', '/dashboard/datasets')
  })
})
