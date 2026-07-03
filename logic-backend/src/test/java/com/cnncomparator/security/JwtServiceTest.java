package com.cnncomparator.security;

import io.jsonwebtoken.MalformedJwtException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtServiceTest {

    private final JwtService jwtService = new JwtService();
    private UserDetails userDetails;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(jwtService, "secret", "unit-test-secret-key-long-enough-for-hmac-sha256");
        userDetails = User.withUsername("michal").password("irrelevant").authorities("ROLE_USER").build();
    }

    @Test
    void generateTokenProducesNonBlankToken() {
        String token = jwtService.generateToken(userDetails);

        assertThat(token).isNotBlank();
    }

    @Test
    void extractUsernameReturnsTheSubjectUsedToGenerateTheToken() {
        String token = jwtService.generateToken(userDetails);

        assertThat(jwtService.extractUsername(token)).isEqualTo("michal");
    }

    @Test
    void isTokenValidReturnsTrueForMatchingUser() {
        String token = jwtService.generateToken(userDetails);

        assertThat(jwtService.isTokenValid(token, userDetails)).isTrue();
    }

    @Test
    void isTokenValidReturnsFalseForDifferentUser() {
        String token = jwtService.generateToken(userDetails);
        UserDetails otherUser = User.withUsername("someoneElse").password("irrelevant").authorities("ROLE_USER").build();

        assertThat(jwtService.isTokenValid(token, otherUser)).isFalse();
    }

    @Test
    void extractUsernameThrowsForMalformedToken() {
        assertThatThrownBy(() -> jwtService.extractUsername("not-a-valid-jwt"))
                .isInstanceOf(MalformedJwtException.class);
    }
}
