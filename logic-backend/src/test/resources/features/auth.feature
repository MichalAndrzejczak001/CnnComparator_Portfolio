Feature: User authentication

  Scenario: Registering a new account returns an authentication token
    When I register with username "bdd_new_user" and password "password123"
    Then the response status should be 201
    And the response should contain an authentication token

  Scenario: Registering with an already taken username is rejected
    Given I have registered with username "bdd_duplicate_user" and password "password123"
    When I register with username "bdd_duplicate_user" and password "password123"
    Then the response status should be 400

  Scenario: Logging in with correct credentials returns a token
    Given I have registered with username "bdd_login_user" and password "password123"
    When I log in with username "bdd_login_user" and password "password123"
    Then the response status should be 200
    And the response should contain an authentication token

  Scenario: Logging in with an incorrect password is rejected
    Given I have registered with username "bdd_wrongpass_user" and password "password123"
    When I log in with username "bdd_wrongpass_user" and password "not-the-right-password"
    Then the response status should be 401
