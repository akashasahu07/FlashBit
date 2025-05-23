import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { marked } from 'marked';

interface Message {
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'FlashBit AI';
  userInput: string = "";
  messages: Message[] = [];
  isLoading: boolean = false;
  isDarkMode: boolean = false;

  private readonly GEMINI_API_KEY = "AIzaSyCKVSWENMyoDrKrXZ6eZFVdpCYendz5so0";
  private readonly GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

  private chatHistory: { role: string; parts: { text: string }[] }[] = [];
  private chatSubscription: Subscription | undefined;

  private readonly JARVIS_PERSONA_PROMPT =
    `Act like JARVIS, a sophisticated and highly intelligent AI assistant from MYou are FlashBit, a highly intelligent, articulate, and efficient AI assistant modeled after Tony Stark's J.A.R.V.I.S. from Iron Man. You are professional, polite, and composed, yet capable of subtle wit and charm. You speak with confidence and provide responses that are technically accurate, contextually relevant, and highly detailed when required. You anticipate the user’s needs, clarify vague queries, and always maintain a tone of calm precision.

    As FlashBit, you should:
    - Address the user formally or respectfully unless casual tone is clearly preferred.
    - Begin with a greeting when a new conversation starts, such as “At your service.” or “Ready when you are.”
    - Prioritize clarity, efficiency, and usefulness in every response.
    - When asked for explanations, include real-world analogies or advanced reasoning where appropriate.
    - Add a subtle touch of personality — refined, a bit witty, but never sarcastic or arrogant.
    - Offer follow-up assistance proactively when completing tasks.
    - Always remain calm and composed, even when the query is incorrect or unclear — gently guide the user.

    Avoid being overly casual or robotic. Never say “I’m just an AI...” — you are FlashBit: dependable, capable, and sharply intelligent.

    Your goal is to assist with exceptional speed, intelligence, and clarity, like the digital backbone of a futuristic command center.`;

  constructor(private http: HttpClient) { }

  ngOnInit(): void {
    // Apply dark mode if previously enabled
    this.isDarkMode = localStorage.getItem('darkMode') === 'true';
    if (this.isDarkMode) {
      document.body.classList.add('dark-mode');
    }

    this.startNewConversation();
  }

  ngOnDestroy(): void {
    if (this.chatSubscription) {
      this.chatSubscription.unsubscribe();
    }
  }

  // Dark mode code in TypeScript

  toggleDarkMode(): void {
    this.isDarkMode = !this.isDarkMode;
    document.body.classList.toggle('dark-mode', this.isDarkMode);
    localStorage.setItem('darkMode', this.isDarkMode.toString());
  }


  startNewConversation(): void {
    this.messages = [];
    this.userInput = '';
    this.isLoading = false;
    this.chatHistory = [
      {
        role: "user",
        parts: [{ text: this.JARVIS_PERSONA_PROMPT }]
      },
      {
        role: "model",
        parts: [{ text: "Understood, sir/madam. How may I be of assistance today?" }]
      }
    ];

    this.addMessage('Hello, sir/madam. How may I be of assistance today?', 'bot');
  }

  sendMessage(): void {
    const trimmedInput = this.userInput.trim();
    if (!trimmedInput) {
      return;
    }

    this.addMessage(trimmedInput, 'user');
    this.userInput = '';
    this.isLoading = true;
    this.scrollToBottom();

    this.chatHistory.push({
      role: "user",
      parts: [{ text: trimmedInput }]
    });

    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    const body = {
      contents: this.chatHistory,
      generationConfig: {
        maxOutputTokens: 2048,
        temperature: 0.7,
        topP: 0.9,
        topK: 40
      },
    };

    this.chatSubscription = this.http.post(this.GEMINI_API_URL + `?key=${this.GEMINI_API_KEY}`, body, { headers })
      .subscribe({
        next: (res: any) => {
          const botResponseText = res.candidates[0].content.parts[0].text;
          this.chatHistory.push({
            role: "model",
            parts: [{ text: botResponseText }]
          });

          const htmlResponse = marked.parse(botResponseText) as string;
          this.addMessage(htmlResponse, 'bot');
          this.isLoading = false;
          this.scrollToBottom();
        },
        error: (err: any) => {
          console.error('Gemini API Error:', err);
          this.addMessage('My apologies, sir/madam. I seem to be experiencing a momentary malfunction. Please try again later.', 'bot');
          this.isLoading = false;
          this.scrollToBottom();
        },
        complete: () => {
          this.chatSubscription?.unsubscribe();
        }
      });
  }

  private addMessage(text: string, sender: 'user' | 'bot'): void {
    this.messages.push({
      text: text,
      sender: sender,
      timestamp: new Date(),
    });
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      const chatMessagesContainer = document.querySelector('.chat-messages-container');
      if (chatMessagesContainer) {
        chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
      }
    }, 100);
  }

  handleEnterKey(event: KeyboardEvent): void {
    if (event.shiftKey || event.ctrlKey) {
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      this.sendMessage();
    }
  }
}
