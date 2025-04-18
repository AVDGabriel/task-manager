import { ChevronUp, Trash2 } from "lucide-react";
import type { Comment } from "@/types";

interface TaskCommentsProps {
  comments: Comment[];
  isExpanded: boolean;
  newComment: string;
  onToggleExpanded: () => void;
  onNewCommentChange: (value: string) => void;
  onAddComment: (e: React.FormEvent) => void;
  onDeleteComment: (id: string) => void;
}

export default function TaskComments({
  comments,
  isExpanded,
  newComment,
  onToggleExpanded,
  onNewCommentChange,
  onAddComment,
  onDeleteComment,
}: TaskCommentsProps) {
  const formatDate = (timestamp: any) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isExpanded) return null;

  return (
    <div className="mt-3 pt-3 border-t border-zinc-700">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-zinc-300">
          Comments {comments.length > 0 && `(${comments.length})`}
        </h3>
        <button 
          onClick={onToggleExpanded}
          className="text-zinc-400 hover:text-zinc-300"
        >
          <ChevronUp size={16} />
        </button>
      </div>
      
      {/* Comments list */}
      <div className="space-y-2 mb-3">
        {comments.length > 0 ? (
          comments.map((comment) => (
            <div 
              key={comment.id} 
              className="bg-zinc-700/50 p-2 rounded text-sm flex justify-between items-start gap-2"
            >
              <div className="flex-1 min-w-0">
                <p className="text-zinc-200">{comment.text}</p>
                <p className="text-xs text-zinc-400 mt-1">
                  {formatDate(comment.createdAt)}
                </p>
              </div>
              <button
                onClick={() => onDeleteComment(comment.id)}
                className="text-zinc-400 p-1 hover:text-red-500 flex-shrink-0"
                title="Delete comment"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))
        ) : (
          <p className="text-sm text-zinc-400 italic">No comments yet</p>
        )}
      </div>
      
      {/* Add comment form */}
      <form onSubmit={onAddComment} className="flex gap-2">
        <input
          type="text"
          value={newComment}
          onChange={(e) => onNewCommentChange(e.target.value)}
          placeholder="Add a comment..."
          className="flex-1 bg-zinc-700 text-white text-sm rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={!newComment.trim()}
          className={`px-3 py-1.5 text-sm rounded ${
            newComment.trim() 
              ? 'bg-blue-500 hover:bg-blue-600 text-white' 
              : 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
          }`}
        >
          Add
        </button>
      </form>
    </div>
  );
} 