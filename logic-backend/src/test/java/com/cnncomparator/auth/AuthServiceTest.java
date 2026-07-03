package com.cnncomparator.auth;

import com.cnncomparator.dto.AuthResponse;
import com.cnncomparator.dto.LoginRequest;
import com.cnncomparator.dto.RegisterRequest;
import com.cnncomparator.enums.Role;
import com.cnncomparator.security.CustomUserDetailsService;
import com.cnncomparator.security.JwtService;
import com.cnncomparator.user.User;
import com.cnncomparator.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtService jwtService;

    @Mock
    private CustomUserDetailsService userDetailsService;

    @Mock
    private AuthenticationManager authenticationManager;

    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService = new AuthService(userRepository, passwordEncoder, jwtService, userDetailsService, authenticationManager);
    }

    @Test
    void registerCreatesUserAndReturnsToken() {
        RegisterRequest request = new RegisterRequest("michal", "password123");
        when(userRepository.findByUsername("michal")).thenReturn(Optional.empty());
        when(passwordEncoder.encode("password123")).thenReturn("encoded-password");

        UserDetails userDetails = mock(UserDetails.class);
        when(userDetailsService.loadUserByUsername("michal")).thenReturn(userDetails);
        when(jwtService.generateToken(userDetails)).thenReturn("generated-token");

        AuthResponse response = authService.register(request);

        assertThat(response.token()).isEqualTo("generated-token");

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(userCaptor.capture());
        User savedUser = userCaptor.getValue();
        assertThat(savedUser.getUsername()).isEqualTo("michal");
        assertThat(savedUser.getPassword()).isEqualTo("encoded-password");
        assertThat(savedUser.getRole()).isEqualTo(Role.USER);
    }

    @Test
    void registerRejectsDuplicateUsername() {
        RegisterRequest request = new RegisterRequest("michal", "password123");
        when(userRepository.findByUsername("michal")).thenReturn(Optional.of(new User()));

        assertThatThrownBy(() -> authService.register(request))
                .isInstanceOf(IllegalArgumentException.class);

        verify(userRepository, never()).save(any());
    }

    @Test
    void loginAuthenticatesAndReturnsToken() {
        LoginRequest request = new LoginRequest("michal", "password123");
        UserDetails userDetails = mock(UserDetails.class);
        when(userDetailsService.loadUserByUsername("michal")).thenReturn(userDetails);
        when(jwtService.generateToken(userDetails)).thenReturn("generated-token");

        AuthResponse response = authService.login(request);

        assertThat(response.token()).isEqualTo("generated-token");
        verify(authenticationManager).authenticate(
                new UsernamePasswordAuthenticationToken("michal", "password123")
        );
    }

    @Test
    void loginPropagatesBadCredentials() {
        LoginRequest request = new LoginRequest("michal", "wrong-password");
        when(authenticationManager.authenticate(any())).thenThrow(new BadCredentialsException("Bad credentials"));

        assertThatThrownBy(() -> authService.login(request))
                .isInstanceOf(BadCredentialsException.class);
    }
}
