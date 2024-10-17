import React, { useState, useRef, useEffect } from "react";
import { FaComments, FaPaperPlane } from "react-icons/fa";
import { IoMdCloseCircleOutline } from "react-icons/io";
import { GoogleGenerativeAI } from "@google/generative-ai";
import ReactMarkdown from "react-markdown";

interface Message {
  sender: "user" | "bot";
  text: string;
}

const Chatbox: React.FC = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [messages, setMessages] = useState<Message[]>([
    { sender: "bot", text: "Hello! How can I assist you today?" },
  ]);
  const [input, setInput] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Initialize the Google AI SDK
  const genAI = new GoogleGenerativeAI("YOUR API KEY HERE");
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-8b" });

  const toggleChatbox = (): void => {
    setIsOpen(!isOpen);
  };

  const sendMessage = async (): Promise<void> => {
    if (input.trim()) {
      const userMessage: Message = { sender: "user", text: input.trim() };
      setMessages((prevMessages) => [...prevMessages, userMessage]);
      const currentInput = input.trim();
      setInput("");

      try {
        // Run the prompt using the Google AI SDK
        const result = await model.generateContent([currentInput]);

        const botResponse = result.response.text();
        const formattedResponse = botResponse; // You can add formatting logic here if needed
        const botMessage: Message = { sender: "bot", text: formattedResponse };
        setMessages((prevMessages) => [...prevMessages, botMessage]);
      } catch (error) {
        console.error("Error generating content:", error);
        const errorMessage: Message = {
          sender: "bot",
          text: "Sorry, I couldn't process that.",
        };
        setMessages((prevMessages) => [...prevMessages, errorMessage]);
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === "Enter") {
      sendMessage();
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <>
      {/* Open Chat Icon */}
      {!isOpen && (
        <button
          onClick={toggleChatbox}
          className="fixed bottom-6 right-6 bg-blue-400 text-white p-4 rounded-full shadow-lg hover:bg-blue-500 focus:outline-none transition-colors z-50"
          aria-label="Open Chat"
        >
          <FaComments size={24} />
        </button>
      )}

      {/* Chatbox Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-end p-6">
          {/* Overlay */}
          <div className="fixed inset-0 bg-black opacity-25 pointer-events-none"></div>

          {/* Chatbox Container */}
          <div className="relative bg-gray-200 w-80 h-[500px] rounded-3xl shadow-lg flex flex-col overflow-hidden transform transition-transform duration-300 ease-in-out">
            {/* Header */}
            <div className="flex justify-between items-center bg-white border-b">
              <span className="text-gray-700 px-4 py-2 font-semibold">
                anku ai
              </span>
              <button onClick={toggleChatbox} className="p-2 text-gray-700">
                <IoMdCloseCircleOutline size={30} />
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-grow p-4 overflow-y-auto bg-gray-100">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${
                    msg.sender === "user" ? "justify-end" : "justify-start"
                  } mb-4`}
                >
                  {msg.sender === "bot" && (
                    <div className="w-8 h-8 rounded-full bg-blue-400 flex-shrink-0 mr-2"></div>
                  )}
                  <div
                    className={`rounded-lg p-2 max-w-[70%] ${
                      msg.sender === "user"
                        ? "bg-blue-400 text-white"
                        : "bg-blue-100 text-gray-800"
                    }`}
                  >
                    {msg.sender === "bot" ? (
                      <ReactMarkdown className="text-sm">
                        {msg.text}
                      </ReactMarkdown>
                    ) : (
                      <p className="text-sm">{msg.text}</p>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Field */}
            <div className="p-4 bg-gray-100">
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type here to chat...."
                  className="w-full bg-white rounded-full text-black py-2 px-4 pr-10 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={sendMessage}
                  className="absolute right-2 text-blue-500 hover:text-blue-600 focus:outline-none"
                  aria-label="Send Message"
                >
                  <FaPaperPlane size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Chatbox;
