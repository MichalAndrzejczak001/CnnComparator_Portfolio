export {}

declare global {
  namespace Cypress {
    interface Chainable {
      loginByToken(token?: string): Chainable<void>
    }
  }
}

Cypress.Commands.add('loginByToken', (token = 'fake-jwt-token') => {
  window.localStorage.setItem('cnncomparator_token', token)
})
