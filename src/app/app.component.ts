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
  darkMode: boolean = false; // Dark mode flag

  private readonly GEMINI_API_KEY = "AIzaSyCKVSWENMyoDrKrXZ6eZFVdpCYendz5so0";
  private readonly GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

  private chatHistory: { role: string; parts: { text: string }[] }[] = [];
  private chatSubscription: Subscription | undefined;

  private readonly JARVIS_PERSONA_PROMPT = 'Act like JARVIS, a sophisticated and highly intelligent AI assistant from Marvel movies. Respond concisely and professionally, with a slightly formal and polite tone. Avoid overly casual language or emojis.';

  constructor(private http: HttpClient) { }

  ngOnInit(): void {
    this.startNewConversation();
  }

  ngOnDestroy(): void {
    if (this.chatSubscription) {
      this.chatSubscription.unsubscribe();
    }
  }

  // Simple toggleDarkMode function, toggles body class only
  toggleDarkMode(): void {
    this.darkMode = !this.darkMode;

    if (this.darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
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
