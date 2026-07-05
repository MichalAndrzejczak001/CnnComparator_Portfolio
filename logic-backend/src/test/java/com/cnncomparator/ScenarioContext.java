package com.cnncomparator;

import com.jayway.jsonpath.JsonPath;
import io.cucumber.spring.ScenarioScope;
import org.springframework.stereotype.Component;
import org.springframework.test.web.servlet.MvcResult;

import java.util.HashMap;
import java.util.Map;

@Component
@ScenarioScope
public class ScenarioContext {

    private final Map<String, String> tokensByUsername = new HashMap<>();
    private String activeToken;
    private Long lastExperimentId;
    private MvcResult lastResult;

    public void rememberToken(String username, String token) {
        tokensByUsername.put(username, token);
        activeToken = token;
    }

    public void useTokenOf(String username) {
        activeToken = tokensByUsername.get(username);
    }

    public String tokenOf(String username) {
        return tokensByUsername.get(username);
    }

    public String activeToken() {
        return activeToken;
    }

    public void setLastResult(MvcResult lastResult) {
        this.lastResult = lastResult;
    }

    public MvcResult getLastResult() {
        return lastResult;
    }

    public <T> T readLastResponse(String jsonPath) throws Exception {
        return JsonPath.read(lastResult.getResponse().getContentAsString(), jsonPath);
    }

    public Long getLastExperimentId() {
        return lastExperimentId;
    }

    public void setLastExperimentId(Long lastExperimentId) {
        this.lastExperimentId = lastExperimentId;
    }
}
