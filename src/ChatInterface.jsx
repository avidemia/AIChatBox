import React, { useState, useEffect, useRef } from 'react';
import { Send, Loader2, Trash2, X, Paperclip } from 'lucide-react';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

// // MathJax configuration
// const mathJaxConfig = {
//   tex: {
//     inlineMath: [['$', '$'], ['\\(', '\\)']],
//     displayMath: [['$$', '$$'], ['\\[', '\\]']],
//   }
// };

const ChatInterface = () => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState('openai');
  const [isLoading, setIsLoading] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const fileInputRef = useRef(null);

  // Model configurations
  // const models = {
  //   openai: {
  //     name: 'OpenAI',
  //     options: ['gpt-4', 'gpt-4-vision-preview'],
  //     generatePrompt: (messages, attachments) => ({
  //       messages: messages.map(msg => ({
  //         role: msg.role,
  //         content: msg.attachments ? 
  //           [
  //             { type: "text", text: msg.content },
  //             ...msg.attachments.map(att => ({
  //               type: att.type.startsWith('image') ? "image_url" :
  //                     att.type === 'application/pdf' ? "file_url" : "text_url",
  //               [att.type.startsWith('image') ? "image_url" : "file_url"]: {
  //                 url: att.dataUrl,
  //                 detail: "high"
  //               }
  //             }))
  //           ] : 
  //           msg.content
  //       })),
  //       model: attachments.length > 0 ? 'gpt-4-vision-preview' : 'gpt-4',
  //       max_tokens: 4096
  //     }),
  //     headers: (apiKey) => ({
  //       'Authorization': `Bearer ${apiKey}`,
  //       'Content-Type': 'application/json'
  //     }),
  //     endpoint: 'https://api.openai.com/v1/chat/completions',
  //     extractResponse: (data) => data.choices[0].message.content
  //   },
  //   anthropic: {
  //     name: 'Anthropic',
  //     options: ['claude-3-opus-latest', 'claude-3-sonnet-latest'],
  //     generatePrompt: (messages, attachments) => ({
  //       messages: messages.map(msg => ({
  //         role: msg.role === 'user' ? 'user' : 'assistant',
  //         content: msg.attachments ? 
  //           [
  //             { type: "text", text: msg.content },
  //             ...msg.attachments.map(att => ({
  //               type: att.type.startsWith('image') ? "image" : "file",
  //               source: {
  //                 type: "base64",
  //                 media_type: att.type,
  //                 data: att.dataUrl.split(',')[1]
  //               }
  //             }))
  //           ] : 
  //           msg.content
  //       })),
  //       model: selectedModel === 'claude-3-opus-latest' ? 'claude-3-opus-latest' : 'claude-3-sonnet-latest',
  //       max_tokens: 4096
  //     }),
  //     headers: (apiKey) => ({
  //       'x-api-key': apiKey,
  //       'Content-Type': 'application/json',
  //       'anthropic-version': '2023-06-01'
  //     }),
  //     endpoint: 'https://api.anthropic.com/v1/messages',
  //     extractResponse: (data) => data.content[0].text
  //   },
  //   gemini: {
  //     name: 'Google',
  //     options: ['gemini-1.5-pro'],
  //     generatePrompt: (messages, attachments) => ({
  //       contents: messages.map(msg => ({
  //         role: msg.role === 'user' ? 'user' : 'model',
  //         parts: msg.attachments ? 
  //           [
  //             { text: msg.content },
  //             ...msg.attachments.map(att => ({
  //               inline_data: {
  //                 mime_type: att.type,
  //                 data: att.dataUrl.split(',')[1]
  //               }
  //             }))
  //           ] : 
  //           [{ text: msg.content }]
  //       })),
  //       model: 'gemini-1.5-pro',
  //       generationConfig: {
  //         maxOutputTokens: 2048,
  //       }
  //     }),
  //     headers: (apiKey) => ({
  //       'x-goog-api-key': apiKey,
  //       'Content-Type': 'application/json'
  //     }),
  //     endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent',
  //     extractResponse: (data) => data.candidates[0].content.parts[0].text
  //   }
  // };
  const models = {
    openai: {
      name: 'OpenAI',
      options: ['gpt-4o', 'chatgpt-4o-latest'],  // Updated to use gpt-4o
      generatePrompt: (messages, attachments) => ({
        model: attachments.length > 0 ? "gpt-4o" : "gpt-4o",
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
        max_tokens: 4096
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
      options: ['claude-2', 'claude-3-5-sonnet-latest'],
      generatePrompt: (messages, attachments, model) => {
        const lastMessage = messages[messages.length - 1];
        return {
          model: model,
          messages: [{
            role: lastMessage.role === 'user' ? 'user' : 'assistant',
            content: lastMessage.attachments ? 
              [
                { type: "text", text: lastMessage.content },
                ...lastMessage.attachments.map(att => ({
                  type: "image",
                  source: {
                    type: "base64",
                    media_type: att.type,
                    data: att.dataUrl.split(',')[1]
                  }
                }))
              ] : 
              lastMessage.content
          }],
          max_tokens: 4096
        };
      },
      headers: (apiKey) => ({
        'x-api-key': apiKey,
        'anthropic-version': '2024-03-10',
        'content-type': 'application/json'
      }),
      endpoint: 'https://api.anthropic.com/v1/messages',
      extractResponse: (data) => {
        if (data.error) throw new Error(data.error.message);
        return data.content[0].text;
      }
    },
    gemini: {
      name: 'Google',
      options: ['gemini-1.5-pro'],
      generatePrompt: (messages, attachments) => {
        const lastMessage = messages[messages.length - 1];
        return {
          contents: [{
            role: lastMessage.role === 'user' ? 'user' : 'model',
            parts: lastMessage.attachments ? 
              [
                { text: lastMessage.content },
                ...lastMessage.attachments.map(att => ({
                  inlineData: {
                    mimeType: att.type,
                    data: att.dataUrl.split(',')[1]
                  }
                }))
              ] : 
              [{ text: lastMessage.content }]
          }]
        };
      },
      headers: (apiKey) => ({
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      }),
      endpoint: 'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent',
      extractResponse: (data) => data.candidates[0].content.parts[0].text
    }
  };

  // Load saved messages from localStorage
  useEffect(() => {
    const savedMessages = localStorage.getItem('chatMessages');
    const savedApiKey = localStorage.getItem('apiKey');
    const savedModel = localStorage.getItem('selectedModel');
    
    if (savedMessages) setMessages(JSON.parse(savedMessages));
    if (savedApiKey) setApiKey(savedApiKey);
    if (savedModel) setSelectedModel(savedModel);
  }, []);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('chatMessages', JSON.stringify(messages));
    localStorage.setItem('apiKey', apiKey);
    localStorage.setItem('selectedModel', selectedModel);
  }, [messages, apiKey, selectedModel]);

  const clearHistory = () => {
    if (window.confirm('Are you sure you want to clear the chat history?')) {
      setMessages([]);
      localStorage.removeItem('chatMessages');
    }
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    const newAttachments = [];
    
    const allowedTypes = {
      'image': ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      'document': [
        'application/pdf',
        'text/plain',
        'text/markdown',
        'application/x-tex',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      ],
      'media': [
        'audio/mpeg',
        'audio/wav',
        'video/mp4',
        'video/webm'
      ]
    };

    const isAllowedType = (type) => {
      return Object.values(allowedTypes).flat().includes(type);
    };

    for (const file of files) {
      if (isAllowedType(file.type)) {
        try {
          const attachment = await processFile(file);
          newAttachments.push(attachment);
        } catch (error) {
          console.error(`Error processing file ${file.name}:`, error);
        }
      } else {
        console.warn(`File type ${file.type} not supported`);
      }
    }

    setAttachments(prev => [...prev, ...newAttachments]);
    fileInputRef.current.value = '';
  };

  const processFile = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          const attachment = {
            name: file.name,
            type: file.type,
            dataUrl: e.target.result,
            size: file.size
          };

          // For text-based files, we can extract the content
          if (file.type.startsWith('text/')) {
            attachment.content = await new TextDecoder().decode(e.target.result);
          }

          resolve(attachment);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(new Error('File reading failed'));

      if (file.type.startsWith('text/')) {
        reader.readAsArrayBuffer(file);
      } else {
        reader.readAsDataURL(file);
      }
    });
  };

  // const makeApiCall = async (model, key, messageHistory, currentAttachments) => {
  //   const modelConfig = models[model];
  //   try {
  //     const response = await fetch(modelConfig.endpoint, {
  //       method: 'POST',
  //       headers: modelConfig.headers(key),
  //       body: JSON.stringify(modelConfig.generatePrompt(messageHistory, currentAttachments))
  //     });

  //     if (!response.ok) {
  //       const errorData = await response.json();
  //       throw new Error(errorData.error?.message || `API call failed: ${response.statusText}`);
  //     }

  //     const data = await response.json();
  //     return modelConfig.extractResponse(data);
  //   } catch (error) {
  //     console.error('API call error:', error);
  //     throw new Error(`API call failed: ${error.message}`);
  //   }
  // };

const makeApiCall = async (model, key, messageHistory, currentAttachments) => {
  // Find the correct model configuration
  let modelProvider;
  if (model.startsWith('gpt')) {
    modelProvider = 'openai';
  } else if (model.startsWith('claude')) {
    modelProvider = 'anthropic';
  } else if (model.startsWith('gemini')) {
    modelProvider = 'gemini';
  }

  const modelConfig = models[modelProvider];
  
  try {
    const prompt = modelConfig.generatePrompt(messageHistory, currentAttachments, model);
    
    // Add request options
    const requestOptions = {
      method: 'POST',
      headers: modelConfig.headers(key),
      body: JSON.stringify(prompt),
      mode: 'cors'  // Added explicit CORS mode
    };

    console.log(`Making ${modelProvider} API call:`, {
      endpoint: modelConfig.endpoint,
      model: model,
      headers: Object.keys(requestOptions.headers), // Log header keys only for security
      messageCount: messageHistory.length,
      hasAttachments: currentAttachments.length > 0
    });

    const response = await fetch(modelConfig.endpoint, requestOptions)
      .catch(error => {
        console.error('Network error:', error);
        throw new Error(`Network error: Please check your internet connection and API key`);
      });

    const data = await response.json().catch(error => {
      console.error('Parse error:', error);
      throw new Error(`Failed to parse response: Invalid API response`);
    });
    
    if (!response.ok) {
      console.error('API error response:', data);
      const errorMessage = data.error?.message || data.message || `Status ${response.status}`;
      throw new Error(errorMessage);
    }

    console.log(`${modelProvider} API response:`, {
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      data: data
    });

    return modelConfig.extractResponse(data);
  } catch (error) {
    console.error(`${modelProvider} API error:`, error);
    throw new Error(`API call failed: ${error.message}`);
  }
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

      // Clear attachments after successful submission
      setAttachments([]);
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'system',
        content: `Error: ${error.message}`
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // // Message rendering with MathJax
  // const renderMessage = (content) => {
  //   return (
  //     <MathJax config={mathJaxConfig}>
  //       <div className="whitespace-pre-wrap">{content}</div>
  //     </MathJax>
  //   );
  // };
  // ADD this new renderMessage function in the same place:
    const renderMessage = (content) => {
      if (!content) return null;
      
      // Split the content by math delimiters
      const parts = content.split(/(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$)/g);
      
      return (
        <div className="whitespace-pre-wrap">
          {parts.map((part, index) => {
            if (part.startsWith('$$') && part.endsWith('$$')) {
              // Display math
              const math = part.slice(2, -2);
              return <BlockMath key={index} math={math} />;
            } else if (part.startsWith('$') && part.endsWith('$')) {
              // Inline math
              const math = part.slice(1, -1);
              return <InlineMath key={index} math={math} />;
            } else {
              // Regular text
              return <span key={index}>{part}</span>;
            }
          })}
        </div>
      );
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
              <optgroup key={key} label={model.name}>
                {model.options.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </optgroup>
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
            {renderMessage(message.content)}
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

      {/* File attachments */}
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
          accept="image/*,.pdf,.txt,.md,.tex,.docx,.pptx,.mp3,.wav,.mp4,.webm"
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