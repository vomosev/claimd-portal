'use client';

import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import {
  Send,
  Bot,
  User,
  Loader2,
  X,
  BotMessageSquare,
  Trash2,
  ChevronDown,
} from 'lucide-react';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────
interface Message {
  id:        string;
  role:      'user' | 'assistant';
  content:   string;
  timestamp: Date;
  isError?:  boolean;
}

interface ChatbotProps {
  /** Override the username — falls back to localStorage */
  username?: string;
}

// ──────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────
const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

// Suggested starter questions
const SUGGESTIONS = [
  'What releases do I have in my catalogue?',
  'Show me my most recent upload',
  'Which of my tracks are singles?',
  'Do I have any albums uploaded?',
  'What genres are in my catalogue?',
];

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────
function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ──────────────────────────────────────────────
// Sub-component: single chat bubble
// ──────────────────────────────────────────────
const ChatBubble = ({ message }: { message: Message }) => {
  const isUser = message.role === 'user';

  return (
    <div
      className={`flex items-end gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {/* Avatar */}
      <div
        className={`
          flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
          ${isUser
            ? 'bg-blue-600 text-white'
            : message.isError
              ? 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400'
              : 'bg-gray-100 dark:bg-[#1A2235] text-gray-600 dark:text-gray-300'
          }
        `}
      >
        {isUser ? <User size={15} /> : <Bot size={15} />}
      </div>

      {/* Bubble */}
      <div
        className={`
          max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm
          ${isUser
            ? 'bg-blue-600 text-white rounded-br-sm'
            : message.isError
              ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-bl-sm'
              : 'bg-white dark:bg-[#151E3A] border border-gray-200 dark:border-[#2D385B] text-gray-800 dark:text-gray-200 rounded-bl-sm'
          }
        `}
      >
        {/* Render newlines from the API response */}
        {message.content.split('\n').map((line, i) => (
          <React.Fragment key={i}>
            {line}
            {i < message.content.split('\n').length - 1 && <br />}
          </React.Fragment>
        ))}

        {/* Timestamp */}
        <p
          className={`text-[10px] mt-1.5 ${
            isUser
              ? 'text-blue-200'
              : message.isError
                ? 'text-red-400'
                : 'text-gray-400 dark:text-gray-500'
          }`}
        >
          {formatTime(message.timestamp)}
        </p>
      </div>
    </div>
  );
};

// ──────────────────────────────────────────────
// Sub-component: typing indicator
// ──────────────────────────────────────────────
const TypingIndicator = () => (
  <div className="flex items-end gap-2.5">
    <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-gray-100 dark:bg-[#1A2235] text-gray-600 dark:text-gray-300">
      <Bot size={15} />
    </div>
    <div className="bg-white dark:bg-[#151E3A] border border-gray-200 dark:border-[#2D385B] rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
      <div className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce [animation-delay:-0.3s]" />
        <span className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce [animation-delay:-0.15s]" />
        <span className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce" />
      </div>
    </div>
  </div>
);

// ──────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────
const CatalogueChatbot = ({ username: propUsername }: ChatbotProps) => {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const [currentUsername, setCurrentUsername] = useState<string>('');

  useEffect(() => {
    const stored = propUsername || localStorage.getItem('username') || '';
    setCurrentUsername(stored);
  }, [propUsername]);

  // ── Chat state ────────────────────────────────────────────────────────────
  const [messages, setMessages]   = useState<Message[]>([
    {
      id:        uid(),
      role:      'assistant',
      content:   `Hi! I'm your catalogue assistant. Ask me anything about your music uploads — tracks, albums, genres, release dates and more.`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput]         = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);

  // ── Refs ──────────────────────────────────────────────────────────────────
  const messagesEndRef   = useRef<HTMLDivElement>(null);
  const inputRef         = useRef<HTMLTextAreaElement>(null);
  const messagesAreaRef  = useRef<HTMLDivElement>(null);

  // ── Auto-scroll to bottom on new message ─────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // ── Auto-resize textarea ──────────────────────────────────────────────────
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
  };

  // ── Send message ──────────────────────────────────────────────────────────
  const sendMessage = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || isLoading) return;

    // Hide suggestions after first real message
    setShowSuggestions(false);

    // Append user message
    const userMsg: Message = {
      id:        uid(),
      role:      'user',
      content:   text,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');

    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }

    setIsLoading(true);

    try {
      const response = await axios.post(
        `${API_URL}/chatbot`,
        {
          message:  text,
          username: currentUsername,
        },
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );

      const reply =
        response.data?.reply    ||
        response.data?.message  ||
        response.data?.response ||
        response.data?.answer   ||
        'I received your message but got an unexpected response format.';

      const assistantMsg: Message = {
        id:        uid(),
        role:      'assistant',
        content:   reply,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMsg]);

    } catch (error: any) {
      console.error('Chatbot error:', error);

      const errorMsg: Message = {
        id:        uid(),
        role:      'assistant',
        content:   error?.response?.data?.error ||
                   error?.response?.data?.message ||
                   'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
        isError:   true,
      };

      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  // ── Handle Enter key (Shift+Enter = newline) ──────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ── Clear conversation ────────────────────────────────────────────────────
  const clearConversation = () => {
    setMessages([
      {
        id:        uid(),
        role:      'assistant',
        content:   `Conversation cleared! Ask me anything about your catalogue.`,
        timestamp: new Date(),
      },
    ]);
    setShowSuggestions(true);
    setInput('');
  };

  // ── Scroll to bottom button visibility ───────────────────────────────────
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const handleScroll = () => {
    const el = messagesAreaRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollBtn(distFromBottom > 120);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // ──────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────
  return (
    <div className="lg:w-[85%] space-y-6">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold mb-1 flex items-center gap-3">
            {/* <BotMessageSquare className="text-blue-600 dark:text-blue-400" size={28} /> */}
            ChatBot
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Ask questions about your music catalogue
            {/* {currentUsername && (
              <span className="ml-1 text-gray-400 dark:text-gray-500">
                · logged in as <span className="font-medium text-gray-600 dark:text-gray-300">{currentUsername}</span>
              </span>
            )} */}
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={clearConversation}
          className="flex items-center gap-2 text-gray-500 hover:text-red-500 hover:border-red-300"
        >
          <Trash2 size={14} />
          Clear
        </Button>
      </div>

      {/* ── Chat window ─────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#151E3A] dark:border dark:border-[#2D385B] rounded-xl shadow-sm flex flex-col overflow-hidden">

        {/* Top bar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 dark:border-[#2D385B] bg-gray-50 dark:bg-[#1A2235]">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
            Catalogue Assistant · Online
          </span>
        </div>

        {/* ── Messages area ────────────────────────────────────────────── */}
        <div
          ref={messagesAreaRef}
          onScroll={handleScroll}
          className="relative flex-1 overflow-y-auto px-4 py-5 space-y-4 min-h-[420px] max-h-[560px]"
        >
          {messages.map((msg) => (
            <ChatBubble key={msg.id} message={msg} />
          ))}

          {/* Typing indicator */}
          {isLoading && <TypingIndicator />}

          {/* Scroll anchor */}
          <div ref={messagesEndRef} />

          {/* Scroll-to-bottom button */}
          {showScrollBtn && (
            <button
              onClick={scrollToBottom}
              className="
                sticky bottom-2 left-1/2 -translate-x-1/2 w-fit
                flex items-center gap-1.5 bg-white dark:bg-[#1A2235]
                border border-gray-200 dark:border-[#2D385B]
                text-gray-500 dark:text-gray-400 text-xs font-medium
                px-3 py-1.5 rounded-full shadow-md
                hover:bg-gray-50 dark:hover:bg-[#2D385B] transition-colors
              "
            >
              <ChevronDown size={13} />
              Scroll to bottom
            </button>
          )}
        </div>

        {/* ── Suggestions ──────────────────────────────────────────────── */}
        {showSuggestions && (
          <div className="px-4 pb-3 border-t border-gray-100 dark:border-[#2D385B] pt-3 bg-gray-50/50 dark:bg-[#1A2235]/50">
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-2 font-medium uppercase tracking-wide">
              Suggested questions
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => sendMessage(s)}
                  disabled={isLoading}
                  className="
                    text-xs px-3 py-1.5 rounded-full
                    bg-white dark:bg-[#151E3A]
                    border border-gray-200 dark:border-[#2D385B]
                    text-gray-600 dark:text-gray-300
                    hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400
                    disabled:opacity-50 disabled:cursor-not-allowed
                    transition-colors
                  "
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Input area ───────────────────────────────────────────────── */}
        <div className="px-4 py-4 border-t border-gray-100 dark:border-[#2D385B] bg-white dark:bg-[#151E3A]">
          <div className="flex items-end gap-3">

            {/* Textarea */}
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your catalogue... (Enter to send, Shift+Enter for new line)"
                rows={1}
                disabled={isLoading}
                className="
                  w-full resize-none px-4 py-3 pr-10 rounded-xl
                  border border-gray-300 dark:border-[#2D385B]
                  bg-gray-50 dark:bg-[#1A2235]
                  text-gray-900 dark:text-white
                  placeholder-gray-400 dark:placeholder-gray-500
                  text-sm leading-relaxed
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                  disabled:opacity-60 disabled:cursor-not-allowed
                  transition-colors
                "
                style={{ minHeight: '48px', maxHeight: '140px' }}
              />

              {/* Clear input button */}
              {input && (
                <button
                  type="button"
                  onClick={() => {
                    setInput('');
                    if (inputRef.current) inputRef.current.style.height = 'auto';
                    inputRef.current?.focus();
                  }}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Send button */}
            <Button
              type="button"
              onClick={() => sendMessage()}
              disabled={!input.trim() || isLoading}
              className="
                flex-shrink-0 h-12 w-12 p-0 rounded-xl
                bg-blue-600 hover:bg-blue-700
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors
              "
            >
              {isLoading
                ? <Loader2 size={18} className="animate-spin text-white" />
                : <Send size={18} className="text-white" />
              }
            </Button>

          </div>

          {/* Hint text */}
          <p className="text-[11px] text-gray-400 dark:text-gray-600 mt-2 text-center">
            Enter to send · Shift+Enter for new line
          </p>
        </div>

      </div>
    </div>
  );
};

export default CatalogueChatbot;