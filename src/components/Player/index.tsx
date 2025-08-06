import React, { useCallback, useState, useRef } from "react";
import { FaPlay, FaPause, FaStop, FaVolumeUp } from "react-icons/fa";
import SoundDriver from "./SoundDriver";

function Player() {
  const soundController = useRef<SoundDriver | null>(null);
  const [loading, setLoading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [volume, setVolume] = useState(1);

  const handleDrop = useCallback(async (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);

    const file = event.dataTransfer.files[0];
    if (!file || !file.type.includes("audio")) {
      alert("Please drop a valid audio file");
      return;
    }

    setLoading(true);
    const soundInstance = new SoundDriver(file);
    try {
      await soundInstance.init(document.getElementById("waveContainer"));
      soundController.current = soundInstance;
      soundInstance.drawChart();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const togglePlayer = useCallback(
    (type: string) => () => {
      if (type === "play") {
        soundController.current?.play();
      } else if (type === "stop") {
        soundController.current?.pause(true);
      } else {
        soundController.current?.pause();
      }
    },
    []
  );

  const onVolumeChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const newVolume = Number(event.target.value);
      setVolume(newVolume);
      soundController.current?.changeVolume(newVolume);
    },
    []
  );

  return (
    <div style={{ width: "100%" }}>
      {!soundController.current && (
        <div
          className={`dropZone ${isDragOver ? "dragOver" : ""}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          🎵 Drag & Drop your audio here
        </div>
      )}

      {loading && <div className="loading">Loading...</div>}

      <div style={{ width: "100%", height: "300px" }} id="waveContainer" />

      {!loading && soundController.current && (
        <div className="controlPanel">
          <button onClick={togglePlayer("play")} title="Play">
            <FaPlay />
          </button>
          <button onClick={togglePlayer("pause")} title="Pause">
            <FaPause />
          </button>
          <button onClick={togglePlayer("stop")} title="Stop">
            <FaStop />
          </button>

          <div className="volumeControl">
            <FaVolumeUp />
            <input
              type="range"
              onChange={onVolumeChange}
              value={volume}
              min={0}
              max={1}
              step={0.01}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default Player;
