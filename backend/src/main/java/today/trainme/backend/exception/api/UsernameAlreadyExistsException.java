package today.trainme.backend.exception.api;

public class UsernameAlreadyExistsException extends ApiException {
    public UsernameAlreadyExistsException(String message) {
        super(message);
    }
}
