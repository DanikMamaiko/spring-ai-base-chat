package org.springai.com.springaitest.controller;

import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.ai.chat.memory.MessageWindowChatMemory;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.ollama.OllamaChatModel;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.util.UUID;

@RestController
public class AiController {

    private final OllamaChatModel chatModel;
    private final ChatMemory chatMemory;
    private final String conversationId = UUID.randomUUID().toString();

    public AiController(OllamaChatModel chatModel, ChatMemory chatMemory) {
        this.chatModel = chatModel;
        this.chatMemory = MessageWindowChatMemory.builder().maxMessages(100).build();
    }

    @GetMapping("/ask")
    public Mono<String> ask(@RequestParam String question) {
        return Mono.fromCallable(() -> chatModel.call(question))
                .subscribeOn(Schedulers.boundedElastic());
    }

    @GetMapping("/ask-stream")
    public Flux<String> askFlux(@RequestParam String question) {

        UserMessage userMessage = new UserMessage(question);
        chatMemory.add(conversationId, userMessage);

        Prompt prompt = new Prompt(chatMemory.get(conversationId));

        Flux<String> response = chatModel.stream(prompt)
                                         .mapNotNull(chunk -> chunk.getResult().getOutput().getText());

        response.collectList().subscribe(fullResponce -> {
            AssistantMessage assistantMessage = new AssistantMessage(String.join("", fullResponce));
            chatMemory.add(conversationId, assistantMessage);
        });

        return response;
        //return chatModel.stream(question);
    }
}
