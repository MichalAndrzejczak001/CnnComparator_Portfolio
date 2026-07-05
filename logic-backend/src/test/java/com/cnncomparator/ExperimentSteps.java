package com.cnncomparator;

import io.cucumber.java.en.Given;
import io.cucumber.java.en.Then;
import io.cucumber.java.en.When;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

public class ExperimentSteps {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ScenarioContext scenarioContext;

    @Given("I have created an experiment for model {string} on dataset {string}")
    public void iHaveCreatedAnExperimentForModelOnDataset(String model, String dataset) throws Exception {
        createExperiment(model, dataset);
    }

    @When("I create an experiment for model {string} on dataset {string}")
    public void iCreateAnExperimentForModelOnDataset(String model, String dataset) throws Exception {
        createExperiment(model, dataset);
    }

    @When("I list my experiments")
    public void iListMyExperiments() throws Exception {
        MvcResult result = mockMvc.perform(get("/experiments")
                        .header("Authorization", "Bearer " + scenarioContext.activeToken()))
                .andReturn();

        scenarioContext.setLastResult(result);
    }

    @When("I delete my last created experiment")
    public void iDeleteMyLastCreatedExperiment() throws Exception {
        MvcResult result = mockMvc.perform(delete("/experiments/" + scenarioContext.getLastExperimentId())
                        .header("Authorization", "Bearer " + scenarioContext.activeToken()))
                .andReturn();

        scenarioContext.setLastResult(result);
    }

    @Then("fetching my last created experiment should return {int}")
    public void fetchingMyLastCreatedExperimentShouldReturn(int expectedStatus) throws Exception {
        MvcResult result = mockMvc.perform(get("/experiments/" + scenarioContext.getLastExperimentId())
                        .header("Authorization", "Bearer " + scenarioContext.activeToken()))
                .andReturn();

        assertThat(result.getResponse().getStatus()).isEqualTo(expectedStatus);
    }

    @When("{string} fetches my last created experiment")
    public void fetchesMyLastCreatedExperiment(String username) throws Exception {
        MvcResult result = mockMvc.perform(get("/experiments/" + scenarioContext.getLastExperimentId())
                        .header("Authorization", "Bearer " + scenarioContext.tokenOf(username)))
                .andReturn();

        scenarioContext.setLastResult(result);
    }

    @When("I compare models on dataset {string}")
    public void iCompareModelsOnDataset(String dataset) throws Exception {
        MvcResult result = mockMvc.perform(post("/experiments/compare")
                        .header("Authorization", "Bearer " + scenarioContext.activeToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"dataset\":\"" + dataset
                                + "\",\"training\":{\"epochs\":2,\"batch_size\":32,\"learning_rate\":0.001}}"))
                .andReturn();

        scenarioContext.setLastResult(result);
    }

    @Then("the experiment response should have a model id")
    public void theExperimentResponseShouldHaveAModelId() throws Exception {
        String modelId = scenarioContext.readLastResponse("$.model_id");
        assertThat(modelId).isNotBlank();
    }

    @Then("my experiment list should contain {int} experiment")
    public void myExperimentListShouldContainExperiment(int expectedCount) throws Exception {
        List<Object> experiments = scenarioContext.readLastResponse("$");
        assertThat(experiments).hasSize(expectedCount);
    }

    private void createExperiment(String model, String dataset) throws Exception {
        MvcResult result = mockMvc.perform(post("/experiments")
                        .header("Authorization", "Bearer " + scenarioContext.activeToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"model\":\"" + model + "\",\"dataset\":\"" + dataset
                                + "\",\"training\":{\"epochs\":2,\"batch_size\":32,\"learning_rate\":0.001}}"))
                .andReturn();

        scenarioContext.setLastResult(result);
        if (result.getResponse().getStatus() == 201) {
            Number id = scenarioContext.readLastResponse("$.id");
            scenarioContext.setLastExperimentId(id.longValue());
        }
    }
}
