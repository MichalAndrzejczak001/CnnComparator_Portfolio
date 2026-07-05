package com.cnncomparator;

import io.cucumber.java.en.Given;
import io.cucumber.java.en.Then;
import io.cucumber.java.en.When;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

public class AuthSteps {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ScenarioContext scenarioContext;

    @Given("I have registered with username {string} and password {string}")
    public void iHaveRegisteredWithUsernameAndPassword(String username, String password) throws Exception {
        // idempotent: the H2 context (and its data) is shared across scenarios,
        // so a username reused via Background falls back to login instead of failing on a duplicate
        MvcResult result = registerRaw(username, password);

        if (result.getResponse().getStatus() == 400) {
            result = loginRaw(username, password);
        }

        scenarioContext.setLastResult(result);
        scenarioContext.rememberToken(username, scenarioContext.readLastResponse("$.token"));
    }

    @Given("another user {string} with password {string} is registered and authenticated")
    public void anotherUserWithPasswordIsRegisteredAndAuthenticated(String username, String password) throws Exception {
        iHaveRegisteredWithUsernameAndPassword(username, password);
    }

    @Given("I am authenticated as {string}")
    public void iAmAuthenticatedAs(String username) {
        scenarioContext.useTokenOf(username);
    }

    @When("I register with username {string} and password {string}")
    public void iRegisterWithUsernameAndPassword(String username, String password) throws Exception {
        scenarioContext.setLastResult(registerRaw(username, password));
    }

    @When("I log in with username {string} and password {string}")
    public void iLogInWithUsernameAndPassword(String username, String password) throws Exception {
        scenarioContext.setLastResult(loginRaw(username, password));
    }

    @Then("the response status should be {int}")
    public void theResponseStatusShouldBe(int expectedStatus) {
        assertThat(scenarioContext.getLastResult().getResponse().getStatus()).isEqualTo(expectedStatus);
    }

    @Then("the response should contain an authentication token")
    public void theResponseShouldContainAnAuthenticationToken() throws Exception {
        String token = scenarioContext.readLastResponse("$.token");
        assertThat(token).isNotBlank();
    }

    private MvcResult registerRaw(String username, String password) throws Exception {
        return mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(credentialsJson(username, password)))
                .andReturn();
    }

    private MvcResult loginRaw(String username, String password) throws Exception {
        return mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(credentialsJson(username, password)))
                .andReturn();
    }

    private String credentialsJson(String username, String password) {
        return "{\"username\":\"" + username + "\",\"password\":\"" + password + "\"}";
    }
}
