"use client";

import { useEffect, useState } from "react";

export default function Taskbar() {
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [time, setTime] = useState<string>("");

  // Get Battery Info (with safety check)
  useEffect(() => {
    if ("getBattery" in navigator) {
      // @ts-ignore → because TS doesn’t know about getBattery
      navigator.getBattery().then((battery) => {
        const updateBattery = () => {
          setBatteryLevel(Math.round(battery.level * 100));
        };
        updateBattery();
        battery.addEventListener("levelchange", updateBattery);
      });
    }
  }, []);

  // Get Time
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    };
    updateTime();
    const timer = setInterval(updateTime, 60000);
    return () => clearInterval(timer);
  }, []);

  // Battery Icon
  const getBatteryIcon = () => {
    if (batteryLevel === null) return "🔋";
    if (batteryLevel > 75) return "🔋";
    if (batteryLevel > 40) return "🔋";
    if (batteryLevel > 15) return "🔋";
    return "⚠";
  };

  return (
    <div className="taskbar">
      <style jsx>{`
        .taskbar {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          height: 40px;
          display: flex;
          justify-content: flex-end; /* Align all to the right */
          align-items: center;
          padding: 6px 14px;
          background: rgba(0, 0, 0, 0.8); /* dark taskbar */
          color: white;
          font-family: sans-serif;
          z-index: 1000; /* always on top */
        }

        .status-group {
          display: flex;
          gap: 14px;
          align-items: center;
        }

        .status-item {
          padding: 4px 10px;
          border-radius: 6px;
        }

        .status-item:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .stop {
          background: rgba(255, 0, 0, 0.85);
          color: white;
          font-weight: bold;
          padding: 4px 12px;
          border-radius: 6px;
          cursor: pointer;
        }

        .stop:hover {
          background: rgba(200, 0, 0, 0.9);
        }
      `}</style>

      <div className="status-group">
        {/* Stop Button */}
        <div className="stop">Stop</div>

        {/* Battery */}
        <div className="status-item">
          {getBatteryIcon()} {batteryLevel !== null ? `${batteryLevel}%` : ""}
        </div>


        {/* Time */}
        <div className="status-item">{time}</div>
      </div>
    </div>
  );
}