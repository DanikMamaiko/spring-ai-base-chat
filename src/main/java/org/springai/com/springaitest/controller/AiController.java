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
        // Оборачиваем вызов chatModel.call(question) в Mono,
        // чтобы выполнить его асинхронно и не блокировать другие потоки
        return Mono.fromCallable(() -> chatModel.call(question))
                // Указываем, что выполнение должно происходить на отдельном пуле потоков,
                // чтобы не блокировать основной (reactive) поток
                .subscribeOn(Schedulers.boundedElastic());
    }

    @GetMapping("/ask-stream")
    public Flux<String> askFlux(@RequestParam String question) {

        UserMessage userMessage = new UserMessage(question);  // Создаём объект пользовательского сообщения (вопрос)
        chatMemory.add(conversationId, userMessage);          // Сохраняем сообщение пользователя в память чата

        Prompt prompt = new Prompt(chatMemory.get(conversationId)); // Формируем prompt из всей истории диалога

        // Получаем потоковый (стриминговый) ответ от чат-модели
        // Преобразуем каждый чанк ответа в текст
        Flux<String> response = chatModel.stream(prompt)
                                         .mapNotNull(chunk -> chunk.getResult().getOutput().getText());
        // chatModel.stream(prompt) возвращает поток чанков/частей ответа (например, "Зд", "рав", "ствуйте!")
        // mapNotNull преобразует каждый чанк в строку и убирает null-значения.

        // Собираем все кусочки ответа в один текст, сохраняем в истории как ответ ассистента
        response.collectList().subscribe(fullResponce -> {
            AssistantMessage assistantMessage = new AssistantMessage(String.join("", fullResponce)); // Склеиваем части в строку
            chatMemory.add(conversationId, assistantMessage); // Сохраняем сообщение ассистента в память чата
        });
        // collectList() собирает все части ответа в список, например ["Зд", "рав", "ствуйте!"]
        // String.join("", fullResponse) даёт "Здравствуйте!"
        // AssistantMessage("Здравствуйте!") сохраняется в истории, чтобы дальше помнить этот ответ

        return response;  // Возвращаем поток строк, чтобы клиент мог получать ответ частями (стриминг)

        // return chatModel.stream(question); // Можно вернуть так, если не нужна история сообщений
    }
}
