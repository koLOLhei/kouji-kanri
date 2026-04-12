"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, MicOff, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/* ---- Web Speech API type declarations ---- */
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition: new () => SpeechRecognitionInstance;
  }
}

function getSpeechRecognition(): (new () => SpeechRecognitionInstance) | null {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

/* ============================================================
   VoiceInput Component
   ============================================================ */

interface VoiceInputProps {
  onResult: (text: string) => void;
  /** Append to existing text, or replace it */
  mode?: "append" | "replace";
  className?: string;
  disabled?: boolean;
}

// D32: Auto-stop timeout — stop recording after 30 s of silence to prevent
// users from leaving the microphone open inadvertently.
const VOICE_TIMEOUT_MS = 30_000;

export function VoiceInput({
  onResult,
  mode = "append",
  className,
  disabled = false,
}: VoiceInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [interim, setInterim] = useState("");
  // D32: Check support before rendering the button at all
  const [supported, setSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const finalTextRef = useRef("");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // D32: Only set supported=true after confirming the API is available
    setSupported(!!getSpeechRecognition());
  }, []);

  // D32: Clear auto-stop timer on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const startRecording = useCallback(() => {
    const SpeechRec = getSpeechRecognition();
    // D32: Guard — should not happen if button is hidden, but be defensive
    if (!SpeechRec) {
      setError("このブラウザは音声入力をサポートしていません");
      return;
    }

    setError(null);
    finalTextRef.current = "";
    const recognition = new SpeechRec();
    recognition.lang = "ja-JP";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = "";
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      if (finalTranscript) {
        finalTextRef.current += finalTranscript;
      }
      setInterim(interimTranscript);
    };

    // D32: Detailed error messages for each Web Speech API failure mode
    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
      switch (event.error) {
        case "no-speech":
          setError("音声が検出されませんでした。もう一度お試しください。");
          break;
        case "not-allowed":
        case "service-not-allowed":
          setError("マイクへのアクセスが拒否されました。ブラウザの設定を確認してください。");
          break;
        case "network":
          setError("ネットワークエラーが発生しました。接続を確認してください。");
          break;
        case "audio-capture":
          setError("マイクが見つかりません。マイクが接続されているか確認してください。");
          break;
        case "aborted":
          // User or timeout aborted — not an error worth surfacing
          setError(null);
          break;
        default:
          setError(`音声入力エラー: ${event.error}`);
      }
      setIsRecording(false);
    };

    recognition.onend = () => {
      if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
      setIsRecording(false);
      setInterim("");
      if (finalTextRef.current) {
        onResult(finalTextRef.current.trim());
      }
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);

    // D32: Auto-stop after VOICE_TIMEOUT_MS of silence
    timeoutRef.current = setTimeout(() => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        setError("30秒経過したため録音を自動停止しました。");
      }
    }, VOICE_TIMEOUT_MS);
  }, [onResult]);

  const stopRecording = useCallback(() => {
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
    recognitionRef.current?.stop();
  }, []);

  const handleClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  if (!supported) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 text-xs text-gray-400",
          className
        )}
        title="このブラウザは音声入力をサポートしていません"
      >
        <AlertCircle className="w-4 h-4" />
        <span className="hidden sm:inline">音声入力非対応</span>
      </span>
    );
  }

  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        title={isRecording ? "録音停止" : "音声入力開始"}
        className={cn(
          "relative inline-flex items-center justify-center w-9 h-9 rounded-full transition-all",
          isRecording
            ? "bg-red-500 text-white shadow-lg shadow-red-300 hover:bg-red-600"
            : "bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        {isRecording ? (
          <>
            {/* Pulsing ring */}
            <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-50" />
            <MicOff className="w-4 h-4 relative z-10" />
          </>
        ) : (
          <Mic className="w-4 h-4" />
        )}
      </button>

      {/* Interim transcription display */}
      {isRecording && (
        <span className="text-xs text-gray-500 max-w-[160px] truncate">
          {interim || "話してください..."}
        </span>
      )}

      {error && (
        <span className="text-xs text-red-500 max-w-[160px] truncate">
          {error}
        </span>
      )}
    </div>
  );
}

/* ============================================================
   VoiceTextarea: textarea with voice input button attached
   ============================================================ */

interface VoiceTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onVoiceResult?: (text: string) => void;
  voiceMode?: "append" | "replace";
}

export function VoiceTextarea({
  value,
  onChange,
  onVoiceResult,
  voiceMode = "append",
  className,
  ...rest
}: VoiceTextareaProps) {
  const handleVoiceResult = (text: string) => {
    const newValue =
      voiceMode === "append" ? (value ? value + "\n" + text : text) : text;

    // Synthetic change event
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype,
      "value"
    )?.set;
    const textarea = document.createElement("textarea");
    nativeInputValueSetter?.call(textarea, newValue);
    const event = new Event("input", { bubbles: true });
    const changeEvent: React.ChangeEvent<HTMLTextAreaElement> = {
      ...event,
      target: { ...textarea, value: newValue } as HTMLTextAreaElement,
      currentTarget: { value: newValue } as HTMLTextAreaElement,
      nativeEvent: event,
      isDefaultPrevented: () => false,
      isPropagationStopped: () => false,
      persist: () => {},
      preventDefault: () => {},
      stopPropagation: () => {},
      bubbles: true,
      cancelable: false,
      defaultPrevented: false,
      eventPhase: 0,
      isTrusted: false,
      timeStamp: Date.now(),
      type: "change",
    };
    onChange(changeEvent);
    onVoiceResult?.(text);
  };

  return (
    <div className="relative">
      <textarea
        value={value}
        onChange={onChange}
        className={cn(className, "pr-12")}
        {...rest}
      />
      <VoiceInput
        onResult={handleVoiceResult}
        mode={voiceMode}
        className="absolute bottom-2 right-2"
      />
    </div>
  );
}
