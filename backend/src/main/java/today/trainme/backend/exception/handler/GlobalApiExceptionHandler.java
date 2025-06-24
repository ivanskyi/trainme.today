package today.trainme.backend.exception.handler;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import today.trainme.backend.exception.api.UsernameAlreadyExistsException;

import java.util.Map;

@RestControllerAdvice
public class GlobalApiExceptionHandler {

    @ExceptionHandler(UsernameAlreadyExistsException.class)
    ResponseEntity<?> handleUsernameAlreadyExists(UsernameAlreadyExistsException exception) {
        return ResponseEntity
                .status(exception.getStatus())
                .body(Map.of(
                        "error", exception.getMessage(),
                        "status", exception.getStatus().value())
                );
    }
}
