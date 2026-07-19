describe('landing page and authentication', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('shows the hero and feature list', () => {
    cy.visit('/')
    cy.contains('h1', 'Compare CNN architectures, side by side.')
    cy.contains('6 CNN architectures')
    cy.contains('Grad-CAM visualizations')
  })

  it('registers a new account and redirects to the dashboard', () => {
    cy.intercept('POST', '/auth/register', {
      statusCode: 201,
      body: { token: 'new-user-token' },
    }).as('register')
    cy.intercept('GET', '/experiments', { statusCode: 200, body: [] }).as('listExperiments')

    cy.visit('/')
    cy.contains('nav button', 'Sign up').click()

    cy.get('.modal').within(() => {
      cy.get('input[autocomplete="username"]').type('newuser')
      cy.get('input[autocomplete="new-password"]').first().type('supersecret')
      cy.get('input[autocomplete="new-password"]').last().type('supersecret')
      cy.contains('button', 'Sign up').click()
    })

    cy.wait('@register')
    cy.url().should('include', '/dashboard')
    cy.window().its('localStorage.cnncomparator_token').should('eq', 'new-user-token')
  })

  it('shows a client-side error when passwords do not match', () => {
    cy.visit('/')
    cy.contains('nav button', 'Sign up').click()

    cy.get('.modal').within(() => {
      cy.get('input[autocomplete="username"]').type('newuser')
      cy.get('input[autocomplete="new-password"]').first().type('supersecret')
      cy.get('input[autocomplete="new-password"]').last().type('somethingelse')
      cy.get('form').submit()

      cy.contains('Passwords do not match')
    })
  })

  it('logs in an existing user', () => {
    cy.intercept('POST', '/auth/login', {
      statusCode: 200,
      body: { token: 'existing-user-token' },
    }).as('login')
    cy.intercept('GET', '/experiments', { statusCode: 200, body: [] }).as('listExperiments')

    cy.visit('/')
    cy.contains('nav button', 'Log in').click()

    cy.get('.modal').within(() => {
      cy.get('input[autocomplete="username"]').type('michal')
      cy.get('input[autocomplete="current-password"]').type('correcthorse')
      cy.contains('button', 'Log in').click()
    })

    cy.wait('@login')
    cy.url().should('include', '/dashboard')
  })

  it('shows the server error message on invalid credentials', () => {
    cy.intercept('POST', '/auth/login', {
      statusCode: 401,
      body: { detail: 'Invalid username or password' },
    }).as('login')

    cy.visit('/')
    cy.contains('nav button', 'Log in').click()

    cy.get('.modal').within(() => {
      cy.get('input[autocomplete="username"]').type('michal')
      cy.get('input[autocomplete="current-password"]').type('wrongpassword')
      cy.contains('button', 'Log in').click()
    })

    cy.wait('@login')
    cy.contains('Invalid username or password')
  })
})
