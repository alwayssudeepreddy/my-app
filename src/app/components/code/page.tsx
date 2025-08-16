"use client";

import React from "react";
import CodeEditor from "./codeediter";

const Page = () => {
  return (
    <div className="container">
      <style jsx>{`
        .container {
          padding: 20px;
          height: 100vh;
          width: 100%;
          background: #2d2d2d;
        }

        .title {
          color: white;
          text-align: center;
          margin-bottom: 20px;
          font-family: "Segoe UI", sans-serif;
        }
      `}</style>

      <h1 className="title">Code Editor</h1>
      <CodeEditor />
    </div>
  );
};

export default Page;
