package today.trainme.backend.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import today.trainme.backend.dto.TopicDto;
import today.trainme.backend.service.TopicService;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("topic")
public class TopicController {

    private final TopicService topicService;

    @GetMapping("")
    public List<TopicDto> getTopics() {
        return topicService.getAll();
    }
}
