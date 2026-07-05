Feature: Experiment management

  Background:
    Given I have registered with username "bdd_experiment_user" and password "password123"
    And I am authenticated as "bdd_experiment_user"

  Scenario: Creating an experiment persists the training results
    When I create an experiment for model "simple_cnn" on dataset "mnist"
    Then the response status should be 201
    And the experiment response should have a model id

  Scenario: A created experiment appears in my experiment list
    Given I have created an experiment for model "simple_cnn" on dataset "mnist"
    When I list my experiments
    Then the response status should be 200
    And my experiment list should contain 1 experiment

  Scenario: I can delete my own experiment
    Given I have created an experiment for model "simple_cnn" on dataset "mnist"
    When I delete my last created experiment
    Then the response status should be 204
    And fetching my last created experiment should return 404

  Scenario: I cannot access another user's experiment
    Given I have created an experiment for model "simple_cnn" on dataset "mnist"
    And another user "bdd_other_user" with password "password123" is registered and authenticated
    When "bdd_other_user" fetches my last created experiment
    Then the response status should be 403

  Scenario: Comparing models proxies to the ai-backend
    When I compare models on dataset "mnist"
    Then the response status should be 200
