"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiFetch, formatDate } from "@/lib/utils";
import { MessageSquare, Send } from "lucide-react";

interface Comment {
  id: string;
  body: string;
  author_name: string;
  created_at: string;
}

interface CommentSectionProps {
  entityType: string;
  entityId: string;
}

export default function CommentSection({ entityType, entityId }: CommentSectionProps) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [body, setBody] = useState("");

  const { data: comments = [], isLoading } = useQuery<Comment[]>({
    queryKey: ["comments", entityType, entityId],
    queryFn: () =>
      apiFetch(`/api/comments?entity_type=${entityType}&entity_id=${entityId}`, { token: token! }),
    enabled: !!token && !!entityId,
  });

  const createMutation = useMutation({
    mutationFn: (commentBody: string) =>
      apiFetch("/api/comments", {
        token: token!,
        method: "POST",
        body: JSON.stringify({
          entity_type: entityType,
          entity_id: entityId,
          body: commentBody,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", entityType, entityId] });
      setBody("");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    createMutation.mutate(body);
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold flex items-center gap-2">
        <MessageSquare className="w-4 h-4" /> コメント ({comments.length})
      </h3>

      {isLoading ? (
        <p className="text-sm text-gray-500">読み込み中...</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-gray-500">コメントがありません</p>
      ) : (
        <div className="space-y-3">
          {comments.map(c => (
            <div key={c.id} className="border rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">{c.author_name}</span>
                <span className="text-xs text-gray-400">{formatDate(c.created_at)}</span>
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{c.body}</p>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2">
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder="コメントを入力..."
          className="flex-1 border rounded px-3 py-2 text-sm h-16 resize-none"
        />
        <button
          type="submit"
          disabled={createMutation.isPending || !body.trim()}
          className="self-end bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
      {createMutation.isError && (
        <p className="text-red-600 text-sm">{(createMutation.error as Error).message}</p>
      )}
    </div>
  );
}
