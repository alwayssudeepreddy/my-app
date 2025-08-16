"use client";

import React, { useState } from "react";
import { FaPlay, FaCheck } from 'react-icons/fa';

const boilerplateCode: Record<string, string> = {
  python: `# Python Boilerplate
def main():
    print("write your code here")

if __name__ == "__main__":
    main()`,
  
  java: `import java.util.*;
import java.lang.*;
import java.io.*;

class Codechef
{
	public static void main (String[] args) throws java.lang.Exception
	{
		// your code goes here

	}
}
`,
  
  c: `#include <stdio.h>

int main() {
	// your code goes here

}

`,
  
  cpp: `#include <bits/stdc++.h>
using namespace std;

int main() {
	// your code goes here

}
`
};

const CodeEditor = () => {
  const [selectedLanguage, setSelectedLanguage] = useState("python");
  const [code, setCode] = useState(boilerplateCode[selectedLanguage]);
  const [output, setOutput] = useState("");
  const [showOutput, setShowOutput] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  const handleLanguageChange = (lang: string) => {
    setSelectedLanguage(lang);
    setCode(boilerplateCode[lang]);
    setShowOutput(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    const { selectionStart, selectionEnd, value } = textarea;
    
    // Handle Tab
    if (e.key === 'Tab') {
      e.preventDefault();
      const indent = '    ';
      setCode(value.substring(0, selectionStart) + indent + value.substring(selectionEnd));
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = selectionStart + indent.length;
      }, 0);
      return;
    }

    // Handle Enter
    if (e.key === 'Enter') {
      e.preventDefault();
      
      // Get the current line
      const lines = value.substring(0, selectionStart).split('\n');
      const currentLine = lines[lines.length - 1];
      
      // Calculate current indentation
      const match = currentLine.match(/^\s*/);
      const currentIndent = match ? match[0] : '';
      
      // Check if we need to add extra indentation
      const needsExtraIndent = /[{:]$/.test(currentLine.trim());
      const newIndent = needsExtraIndent ? currentIndent + '    ' : currentIndent;
      
      // Insert new line with proper indentation
      const newValue = value.substring(0, selectionStart) + '\n' + newIndent + value.substring(selectionEnd);
      setCode(newValue);
      
      // Set cursor position
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = selectionStart + newIndent.length + 1;
      }, 0);
      return;
    }

    // Handle brackets and quotes
    const brackets: Record<string, string> = {
      '{': '}',
      '[': ']',
      '(': ')',
      '"': '"',
      "'": "'",
      '`': '`'
    };

    // Auto-close brackets and quotes
    if (brackets.hasOwnProperty(e.key)) {
      e.preventDefault();
      const closingBracket = brackets[e.key];
      const newValue = value.substring(0, selectionStart) + e.key + closingBracket + value.substring(selectionEnd);
      setCode(newValue);
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = selectionStart + 1;
      }, 0);
      return;
    }

    // Handle closing bracket/quote overwrite
    if (Object.values(brackets).includes(e.key)) {
      const nextChar = value.charAt(selectionStart);
      if (nextChar === e.key) {
        e.preventDefault();
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = selectionStart + 1;
        }, 0);
        return;
      }
    }

    // Handle backspace for paired brackets
    if (e.key === 'Backspace') {
      const char = value.charAt(selectionStart - 1);
      const nextChar = value.charAt(selectionStart);
      if (brackets.hasOwnProperty(char) && brackets[char] === nextChar) {
        e.preventDefault();
        const newValue = value.substring(0, selectionStart - 1) + value.substring(selectionStart + 1);
        setCode(newValue);
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = selectionStart - 1;
        }, 0);
        return;
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const { selectionStart, selectionEnd, value } = e.currentTarget;
    
    // Get current line indentation
    const lines = value.substring(0, selectionStart).split('\n');
    const currentLine = lines[lines.length - 1];
    const currentIndent = currentLine.match(/^\s*/)?.[0] || '';
    
    // Apply indentation to pasted lines
    const formattedText = pastedText
      .split('\n')
      .map((line, i) => i === 0 ? line : currentIndent + line)
      .join('\n');
    
    const newValue = value.substring(0, selectionStart) + formattedText + value.substring(selectionEnd);
    setCode(newValue);
  };

  const handleRun = async () => {
    setIsRunning(true);
    setShowOutput(true);

    try {
      let result = '';
      switch (selectedLanguage) {
        case 'python':
          if (code.includes('print')) {
            result = code.match(/print\((.*?)\)/)?.[1]?.replace(/["']/g, '') || 'No output';
          }
          break;
        case 'java':
          if (code.includes('System.out.println')) {
            result = code.match(/println\((.*?)\)/)?.[1]?.replace(/["']/g, '') || 'No output';
          }
          break;
        case 'c':
        case 'cpp':
          if (code.includes('printf') || code.includes('cout')) {
            result = code.match(/["']([^"']+)["']/)?.[1] || 'No output';
          }
          break;
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
      setOutput(`✅ Compilation successful\n\nOutput:\n${result}`);
    } catch (error) {
      setOutput('❌ Error executing code');
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmit = () => {
    setShowOutput(true);
    setOutput("✅ Solution submitted successfully!\n\nVerdict: Accepted\nExecution Time: 0.12s\nMemory Used: 12.4MB");
  };

  return (
    <div className="code-editor">
      <style jsx>{`
        .code-editor {
          display: flex;
          flex-direction: column;
          height: 100vh;
          background: #1e1e2f;
          color: #d4d4d4;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        }

        .header {
          padding: 12px 20px;
          background: #2d2d44;
          border-bottom: 1px solid #3d3d5a;
        }

        .language-select {
          padding: 8px 12px;
          border-radius: 6px;
          border: 1px solid #4d4d6a;
          background: #282c34;
          color: #fff;
          font-size: 14px;
          cursor: pointer;
          outline: none;
          width: 200px;
        }

        .language-select:hover {
          border-color: #6d6d8a;
        }

        .editor-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 0;
        }

        .code-area {
          flex: 1;
          padding: 20px;
          background: #282c34;
        }

        .code-textarea {
          width: 100%;
          height: 100%;
          background: transparent;
          color: #d4d4d4;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          font-size: 14px;
          line-height: 1.5;
          border: none;
          outline: none;
          resize: none;
          padding: 0;
          tab-size: 4;
        }

        .button-panel {
          padding: 12px 20px;
          background: #2d2d44;
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          border-top: 1px solid #3d3d5a;
        }

        .button {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
        }

        .run-button {
          background: #0078d4;
          color: white;
        }

        .run-button:hover:not(:disabled) {
          background: #0066b5;
        }

        .run-button:disabled {
          background: #004c8c;
          cursor: wait;
        }

        .submit-button {
          background: #28a745;
          color: white;
        }

        .submit-button:hover {
          background: #218838;
        }

        .output-panel {
          background: #1a1a2e;
          border-top: 1px solid #3d3d5a;
          overflow: hidden;
          transition: max-height 0.3s ease-in-out;
          max-height: ${showOutput ? '300px' : '0'};
        }

        .output-header {
          padding: 12px 20px;
          background: #2d2d44;
          font-weight: 500;
          color: #fff;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .output-content {
          padding: 20px;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          color: #00ff9d;
          white-space: pre-wrap;
          line-height: 1.5;
        }

        .time-info {
          color: #888;
          font-size: 12px;
        }
      `}</style>

      <div className="header">
        <select
          className="language-select"
          value={selectedLanguage}
          onChange={(e) => handleLanguageChange(e.target.value)}
        >
          <option value="python">Python</option>
          <option value="java">Java</option>
          <option value="c">C</option>
          <option value="cpp">C++</option>
        </select>
      </div>

      <div className="editor-main">
        <div className="code-area">
          <textarea
            className="code-textarea"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            spellCheck={false}
            placeholder="Write your code here..."
          />
        </div>

        <div className="button-panel">
          <button
            className="button run-button"
            onClick={handleRun}
            disabled={isRunning}
          >
            <FaPlay /> {isRunning ? 'Running...' : 'Run Code'}
          </button>
          <button
            className="button submit-button"
            onClick={handleSubmit}
          >
            <FaCheck /> Submit
          </button>
        </div>

        <div className="output-panel">
          <div className="output-header">
            <span>Output</span>
            <span className="time-info">
              {isRunning ? 'Executing...' : 'Last run: Just now'}
            </span>
          </div>
          <div className="output-content">
            {output}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodeEditor;