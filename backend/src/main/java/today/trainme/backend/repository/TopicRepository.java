package today.trainme.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import today.trainme.backend.model.Topic;

public interface TopicRepository extends JpaRepository<Topic, Long> {
}
