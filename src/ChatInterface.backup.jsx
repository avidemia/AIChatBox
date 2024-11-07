import React, { useState, useEffect, useRef } from 'react';
import { Send, Loader2, Save, Trash2, Image, FileText, X, Paperclip } from 'lucide-react';

const ChatInterface = () => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState('openai');
  const [isLoading, setIsLoading] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const fileInputRef = useRef(null);

  // Load saved messages from localStorage on startup
  useEffect(() => {
    const savedMessages = localStorage.getItem('chatMessages');
    const savedApiKey = localStorage.getItem('apiKey');
    const savedModel = localStorage.getItem('selectedModel');
    
    if (savedMessages) setMessages(JSON.parse(savedMessages));
    if (savedApiKey) setApiKey(savedApiKey);
    if (savedModel) setSelectedModel(savedModel);
  }, []);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('chatMessages', JSON.stringify(messages));
    localStorage.setItem('apiKey', apiKey);
    localStorage.setItem('selectedModel', selectedModel);
  }, [messages, apiKey, selectedModel]);

  const models = {
    openai: {
      name: 'OpenAI',
      options: ['gpt-4-vision-preview', 'gpt-4'],
      generatePrompt: (messages, attachments) => ({
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.attachments ? 
            [
              { type: "text", text: msg.content },
              ...msg.attachments.map(att => ({
                type: "image_url",
                image_url: {
                  url: att.dataUrl,
                  detail: "high"
                }
              }))
            ] : 
            msg.content
        })),
        model: attachments.length > 0 ? 'gpt-4-vision-preview' : 'gpt-4',
        max_tokens: 2048
      }),
      headers: (apiKey) => ({
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }),
      endpoint: 'https://api.openai.com/v1/chat/completions',
      extractResponse: (data) => data.choices[0].message.content
    },
    anthropic: {
      name: 'Anthropic',
      options: ['claude-3-opus', 'claude-3-sonnet'],
      generatePrompt: (messages, attachments) => ({
        messages: messages.map(msg => ({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.attachments ? 
            [
              { type: "text", text: msg.content },
              ...msg.attachments.map(att => ({
                type: att.type.startsWith('image') ? "image" : "file",
                source: {
                  type: "base64",
                  media_type: att.type,
                  data: att.dataUrl.split(',')[1]
                }
              }))
            ] : 
            msg.content
        })),
        model: 'claude-3-opus',
        max_tokens: 1024
      }),
      headers: (apiKey) => ({
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      }),
      endpoint: 'https://api.anthropic.com/v1/messages',
      extractResponse: (data) => data.content[0].text
    }
  };

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    const newAttachments = [];

    for (const file of files) {
      if (file.type.startsWith('image/') || file.type === 'application/pdf') {
        try {
          const attachment = await processFile(file);
          newAttachments.push(attachment);
        } catch (error) {
          console.error(`Error processing file ${file.name}:`, error);
        }
      }
    }

    setAttachments(prev => [...prev, ...newAttachments]);
    fileInputRef.current.value = ''; // Reset file input
  };

  const processFile = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          if (file.type === 'application/pdf') {
            // For PDFs, we'll need to extract text
            // Note: In a real implementation, you'd want to use a PDF parsing library
            resolve({
              name: file.name,
              type: file.type,
              dataUrl: e.target.result,
              size: file.size
            });
          } else {
            // For images, we can use the data URL directly
            resolve({
              name: file.name,
              type: file.type,
              dataUrl: e.target.result,
              size: file.size
            });
          }
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(new Error('File reading failed'));

      if (file.type === 'application/pdf') {
        reader.readAsArrayBuffer(file);
      } else {
        reader.readAsDataURL(file);
      }
    });
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const makeApiCall = async (model, key, messageHistory, currentAttachments) => {
    const modelConfig = models[model];
    const response = await fetch(modelConfig.endpoint, {
      method: 'POST',
      headers: modelConfig.headers(key),
      body: JSON.stringify(modelConfig.generatePrompt(messageHistory, currentAttachments))
    });

    if (!response.ok) {
      throw new Error(`API call failed: ${response.statusText}`);
    }

    const data = await response.json();
    return modelConfig.extractResponse(data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if ((!inputMessage.trim() && attachments.length === 0) || !apiKey) return;

    const newMessage = {
      role: 'user',
      content: inputMessage,
      ...(attachments.length > 0 && { attachments: [...attachments] })
    };

    setMessages(prev => [...prev, newMessage]);
    setInputMessage('');
    setAttachments([]);
    setIsLoading(true);

    try {
      const response = await makeApiCall(
        selectedModel, 
        apiKey, 
        [...messages, newMessage],
        attachments
      );
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response
      }]);
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'system',
        content: `Error: ${error.message}`
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearHistory = () => {
    if (window.confirm('Are you sure you want to clear the chat history?')) {
      setMessages([]);
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto p-4">
      {/* Header with API Key input and model selection */}
      <div className="mb-4 space-y-2">
        <div className="flex gap-2">
          <input
            type="password"
            placeholder="Enter API Key"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="flex-1 p-2 border rounded"
          />
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="w-48 p-2 border rounded"
          >
            {Object.entries(models).map(([key, model]) => (
              <option key={key} value={key}>{model.name}</option>
            ))}
          </select>
          <button
            onClick={clearHistory}
            className="p-2 bg-red-500 text-white rounded hover:bg-red-600"
            title="Clear chat history"
          >
            <Trash2 className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 p-4 border rounded">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`p-2 rounded ${
              message.role === 'user'
                ? 'bg-blue-100 ml-auto max-w-[80%]'
                : message.role === 'assistant'
                ? 'bg-gray-100 max-w-[80%]'
                : 'bg-red-100 max-w-[80%]'
            }`}
          >
            <p className="text-sm font-semibold">{message.role}</p>
            <p className="whitespace-pre-wrap">{message.content}</p>
            {message.attachments && (
              <div className="mt-2 flex flex-wrap gap-2">
                {message.attachments.map((att, i) => (
                  <div key={i} className="relative">
                    {att.type.startsWith('image/') ? (
                      <img 
                        src={att.dataUrl} 
                        alt={att.name}
                        className="max-w-xs max-h-48 rounded"
                      />
                    ) : (
                      <div className="flex items-center gap-2 p-2 bg-white rounded">
                        <FileText className="w-4 h-4" />
                        <span>{att.name}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Attachments preview */}
      {attachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2 p-2 border rounded">
          {attachments.map((att, index) => (
            <div key={index} className="relative group">
              {att.type.startsWith('image/') ? (
                <div className="relative">
                  <img 
                    src={att.dataUrl} 
                    alt={att.name}
                    className="w-16 h-16 object-cover rounded"
                  />
                  <button
                    onClick={() => removeAttachment(index)}
                    className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="relative flex items-center gap-2 p-2 bg-gray-100 rounded">
                  <FileText className="w-4 h-4" />
                  <span className="text-sm">{att.name}</span>
                  <button
                    onClick={() => removeAttachment(index)}
                    className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Input form */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept="image/*,application/pdf"
          className="hidden"
          multiple
        />
        <button
          type="button"
          onClick={() => fileInputRef.current.click()}
          className="p-2 bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
          title="Attach files"
        >
          <Paperclip className="w-6 h-6" />
        </button>
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="Type your message..."
          className="flex-1 p-2 border rounded"
          disabled={isLoading || !apiKey}
        />
        <button
          type="submit"
          disabled={isLoading || !apiKey || (!inputMessage.trim() && attachments.length === 0)}
          className="p-2 bg-blue-500 text-white rounded disabled:bg-gray-300 hover:bg-blue-600"
        >
          {isLoading ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <Send className="w-6 h-6" />
          )}
        </button>
      </form>
    </div>
  );
};

export default ChatInterface;
