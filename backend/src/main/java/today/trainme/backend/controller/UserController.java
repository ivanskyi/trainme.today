package today.trainme.backend.controller;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/user")
public class UserController {

    private static final String HELLO_MESSAGE = "Hello, ";

    @GetMapping("/profile")
    public String getUserProfile(@AuthenticationPrincipal UserDetails userDetails) {
        return HELLO_MESSAGE + userDetails.getUsername();
    }
}
