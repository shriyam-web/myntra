import React from "react";
import { Message, Theme } from "../types";

interface ChatInputProps {
  newMessage: string;
  setNewMessage: React.Dispatch<React.SetStateAction<string>>;
  handleSendMessage: (e?: React.FormEvent) => void;
  replyingTo: Message | null;
  setReplyingTo: React.Dispatch<React.SetStateAction<Message | null>>;
  activeTheme: Theme;
  messageInputRef: React.RefObject<HTMLTextAreaElement | null>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  selectedImages: string[];
  setSelectedImages: React.Dispatch<React.SetStateAction<string[]>>;
  selectedVideos: string[];
  setSelectedVideos: React.Dispatch<React.SetStateAction<string[]>>;
  selectedFiles: File[];
  setSelectedFiles: React.Dispatch<React.SetStateAction<File[]>>;
  isUploading: boolean;
  isMediaUploading?: boolean;
  uploadProgress: number;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  newMessage,
  setNewMessage,
  handleSendMessage,
  replyingTo,
  setReplyingTo,
  activeTheme,
  messageInputRef,
  fileInputRef,
  selectedImages,
  setSelectedImages,
  selectedVideos,
  setSelectedVideos,
  selectedFiles,
  setSelectedFiles,
  isUploading,
  isMediaUploading,
  uploadProgress,
}) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    const newFiles = Array.from(files);
    setSelectedFiles([...selectedFiles, ...newFiles]);

    newFiles.forEach(file => {
      const url = URL.createObjectURL(file);
      if (file.type.startsWith('video/')) {
        setSelectedVideos(prev => [...prev, url]);
      } else {
        setSelectedImages(prev => [...prev, url]);
      }
    });
  };

  const removeImage = (idx: number) => {
    const urlToRemove = selectedImages[idx];
    setSelectedImages(selectedImages.filter((_, i) => i !== idx));
    
    // Find the file that matches this image
    // Since we can't easily match URL.createObjectURL, we'll use a better approach:
    // Filter selectedFiles by removing the file that corresponds to this index among images
    let imageCount = 0;
    setSelectedFiles(selectedFiles.filter(file => {
      if (!file.type.startsWith('video/')) {
        if (imageCount === idx) {
          imageCount++;
          return false;
        }
        imageCount++;
      }
      return true;
    }));
    
    URL.revokeObjectURL(urlToRemove);
  };

  const removeVideo = (idx: number) => {
    const urlToRemove = selectedVideos[idx];
    setSelectedVideos(selectedVideos.filter((_, i) => i !== idx));
    
    let videoCount = 0;
    setSelectedFiles(selectedFiles.filter(file => {
      if (file.type.startsWith('video/')) {
        if (videoCount === idx) {
          videoCount++;
          return false;
        }
        videoCount++;
      }
      return true;
    }));
    
    URL.revokeObjectURL(urlToRemove);
  };

  return (
    <div className="p-4 sm:p-6 bg-zinc-900/60 backdrop-blur-3xl border-t border-zinc-800/50 z-20">
      {replyingTo && (
        <div className="mb-4 p-4 bg-zinc-950/80 rounded-[2rem] border border-zinc-800 flex items-center justify-between animate-in slide-in-from-bottom-2 duration-300 backdrop-blur-xl">
          <div className="flex items-center gap-4 overflow-hidden">
            <div className={`w-1.5 h-10 rounded-full ${activeTheme.bubbleMe} shrink-0`}></div>
            <div className="overflow-hidden">
              <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-500 mb-1">
                Replying to {replyingTo.createdBy}
              </p>
              <p className="text-xs text-white/80 line-clamp-1 font-normal italic">
                {replyingTo.text || "Media Content"}
              </p>
            </div>
          </div>
          <button
            onClick={() => setReplyingTo(null)}
            className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-full text-zinc-500 hover:text-white transition-all active:scale-90"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}

      {(selectedImages.length > 0 || selectedVideos.length > 0) && (
        <div className="mb-4 flex gap-3 overflow-x-auto no-scrollbar pb-2 animate-in slide-in-from-bottom-2 duration-300">
          {selectedImages.map((url, idx) => (
            <div key={`img-${idx}`} className="relative group shrink-0">
              <img
                src={url}
                className="w-24 h-24 object-cover rounded-[1.5rem] border-2 border-zinc-800 shadow-2xl group-hover:border-white transition-all"
              />
              <button
                type="button"
                onClick={() => removeImage(idx)}
                className="absolute -top-2 -right-2 p-2 bg-red-600 text-white rounded-full shadow-2xl opacity-0 group-hover:opacity-100 transition-all hover:scale-110 active:scale-90"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="12" height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          ))}
          {selectedVideos.map((url, idx) => (
            <div key={`vid-${idx}`} className="relative group shrink-0">
              <video
                src={url}
                className="w-24 h-24 object-cover rounded-[1.5rem] border-2 border-zinc-800 shadow-2xl group-hover:border-white transition-all"
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-black/40 rounded-full p-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeVideo(idx)}
                className="absolute -top-2 -right-2 p-2 bg-red-600 text-white rounded-full shadow-2xl opacity-0 group-hover:opacity-100 transition-all hover:scale-110 active:scale-90"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="12" height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-24 h-24 flex items-center justify-center bg-zinc-950 border-2 border-dashed border-zinc-800 rounded-[1.5rem] text-zinc-700 hover:text-zinc-500 hover:border-zinc-700 transition-all shrink-0 active:scale-95"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24" height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="flex items-end gap-3 max-w-2xl mx-auto"
      >
        <div className="flex-1 flex flex-col gap-2">
          {isUploading && (
             <div className="w-full flex flex-col gap-1 mb-2">
                <div className="flex justify-between items-center text-[10px] font-medium uppercase tracking-widest text-zinc-500 px-1">
                    <span>{isMediaUploading ? "Uploading Media..." : "Sending Message..."}</span>
                    {isMediaUploading && <span>{uploadProgress}%</span>}
                </div>
                {isMediaUploading && (
                  <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                      <div 
                          className={`h-full ${activeTheme.bubbleMe} transition-all duration-300 shadow-[0_0_10px_rgba(255,255,255,0.2)]`} 
                          style={{ width: `${uploadProgress}%` }}
                      ></div>
                  </div>
                )}
             </div>
          )}
          <div className="relative group/input flex items-end bg-zinc-950 border border-zinc-800 rounded-[1.5rem] focus-within:border-zinc-700 transition-all shadow-inner overflow-hidden">
             <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-4 text-zinc-600 hover:text-white transition-all active:scale-90 shrink-0"
                title="Attach Media"
                disabled={isUploading && isMediaUploading}
             >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.59a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
             </button>
             <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                multiple 
                accept="image/*,video/*"
             />
             <textarea
                ref={messageInputRef}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                className="w-full bg-transparent text-white text-sm font-normal py-4 px-1 outline-none no-scrollbar resize-none max-h-40 placeholder:text-zinc-800"
                placeholder="Say, Hello!"
                rows={1}
                autoFocus
                spellCheck={false}
             />
          </div>
        </div>
        <button
          type="submit"
          disabled={(!newMessage.trim() && selectedImages.length === 0 && selectedVideos.length === 0) || (isUploading && isMediaUploading)}
          className={`h-14 w-14 flex items-center justify-center rounded-2xl transition-all shadow-xl active:scale-90 shrink-0 ${
            (newMessage.trim() || selectedImages.length > 0 || selectedVideos.length > 0) && !(isUploading && isMediaUploading)
              ? `${activeTheme.bubbleMe} text-white hover:opacity-90`
              : "bg-zinc-800/50 text-zinc-700 cursor-not-allowed border border-zinc-800/50"
          }`}
        >
          {isUploading ? (
             <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
          ) : (
             <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="translate-x-0.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          )}
        </button>
      </form>
    </div>
  );
};
