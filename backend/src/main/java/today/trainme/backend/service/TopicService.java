package today.trainme.backend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import today.trainme.backend.dto.TopicDto;
import today.trainme.backend.model.Topic;
import today.trainme.backend.repository.TopicRepository;

import java.util.List;

@Service
@RequiredArgsConstructor
public class TopicService {

    private final TopicRepository topicRepository;

    public List<TopicDto> getAll() {
        return topicRepository.findAll().stream()
                .map(this::mapToDto)
                .toList();
    }

    private TopicDto mapToDto(Topic topic) {
        TopicDto dto = new TopicDto();
        dto.setId(topic.getId());
        dto.setName(topic.getName());
        return dto;
    }
}
