import { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'sonner';

interface UseMessageEditorProps {
  messagesContainerRef: React.RefObject<HTMLDivElement>;
}

interface UseMessageEditorReturn {
  editingMessageIndex: number | null;
  editedContent: string;
  editRef: React.RefObject<HTMLTextAreaElement>;
  messageRefs: React.MutableRefObject<Record<number, HTMLDivElement | null>>;
  overlayTop: number | null;
  handleEditMessage: (index: number) => void;
  handleCancelEdit: () => void;
  handleSubmitEdit: () => Promise<void>;
  setEditedContent: (content: string) => void;
  updateOverlayOnScroll: () => void;
}

export function useMessageEditor({ 
  messagesContainerRef
}: UseMessageEditorProps): UseMessageEditorReturn {
  const [editingMessageIndex, setEditingMessageIndex] = useState<number | null>(null);
  const [editedContent, setEditedContent] = useState<string>('');
  const [overlayTop, setOverlayTop] = useState<number | null>(null);
  const editRef = useRef<HTMLTextAreaElement>(null);
  const messageRefs = useRef<Record<number, HTMLDivElement | null>>({});

  // Update overlay position when scrolling
  const updateOverlayOnScroll = useCallback(() => {
    if (editingMessageIndex !== null && messageRefs.current[editingMessageIndex]) {
      const rect = messageRefs.current[editingMessageIndex]?.getBoundingClientRect();
      const containerRect = messagesContainerRef.current?.getBoundingClientRect();
      if (rect && containerRect) {
        setOverlayTop(rect.bottom - containerRect.top);
      }
    }
  }, [editingMessageIndex, messagesContainerRef]);

  // Handler for starting to edit a message
  const handleEditMessage = useCallback((index: number) => {
    // Check if this is a user message (could be passed from the message component)
    setEditingMessageIndex(index);
    setEditedContent(""); // This would be set to the actual message content
    
    // Set overlay position based on the bottom of the message
    if (messageRefs.current[index]) {
      const rect = messageRefs.current[index]?.getBoundingClientRect();
      const containerRect = messagesContainerRef.current?.getBoundingClientRect();
      if (rect && containerRect) {
        setOverlayTop(rect.bottom - containerRect.top);
      }
    }
  }, [messagesContainerRef]);

  // Handler for canceling an edit
  const handleCancelEdit = useCallback(() => {
    setEditingMessageIndex(null);
    setEditedContent('');
    setOverlayTop(null);
  }, []);

  // Handler for submitting an edit
  const handleSubmitEdit = useCallback(async () => {
    if (editingMessageIndex === null) return;
    
    try {
      // This would be where you update the message in an API
      // and update the local state in the parent component
      
      // Clear editing state
      setEditingMessageIndex(null);
      setEditedContent('');
      setOverlayTop(null);
      
      toast.success('Message updated');
    } catch (err) {
      console.error('Error updating message:', err);
      toast.error('Failed to update message');
    }
  }, [editingMessageIndex]);

  // Focus the edit textarea when editing begins
  useEffect(() => {
    if (editingMessageIndex !== null && editRef.current) {
      editRef.current.focus();
    }
  }, [editingMessageIndex]);

  // Handle click outside to exit edit mode
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (editingMessageIndex !== null && 
          editRef.current && 
          !editRef.current.contains(e.target as Node) &&
          !(e.target as Element).closest('.edit-actions')) {
        handleCancelEdit();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [editingMessageIndex, handleCancelEdit]);

  // Handle keyboard shortcuts for edit mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editingMessageIndex !== null) {
        // Submit on Ctrl+Enter or Cmd+Enter
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
          e.preventDefault();
          handleSubmitEdit();
        }
        
        // Cancel on Escape
        if (e.key === 'Escape') {
          e.preventDefault();
          handleCancelEdit();
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [editingMessageIndex, handleCancelEdit, handleSubmitEdit]);

  // Update overlay position if window is resized
  useEffect(() => {
    const updateOverlayPosition = () => {
      if (editingMessageIndex !== null && messageRefs.current[editingMessageIndex]) {
        const rect = messageRefs.current[editingMessageIndex]?.getBoundingClientRect();
        const containerRect = messagesContainerRef.current?.getBoundingClientRect();
        if (rect && containerRect) {
          setOverlayTop(rect.bottom - containerRect.top);
        }
      }
    };

    window.addEventListener('resize', updateOverlayPosition);
    return () => window.removeEventListener('resize', updateOverlayPosition);
  }, [editingMessageIndex, messagesContainerRef]);

  return {
    editingMessageIndex,
    editedContent,
    editRef,
    messageRefs,
    overlayTop,
    handleEditMessage,
    handleCancelEdit,
    handleSubmitEdit,
    setEditedContent,
    updateOverlayOnScroll
  };
} 