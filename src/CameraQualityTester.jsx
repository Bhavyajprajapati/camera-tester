import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Camera,
  Download,
  Zap,
  ZapOff,
  RotateCcw,
  CheckCircle,
  AlertTriangle,
  FileText,
  X,
  Grid3x3,
  Settings,
} from "lucide-react";

const EnhancedMobileOMRScanner = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const cropCanvasRef = useRef(null);
  const streamRef = useRef(null);
  const [croppedImage, setCroppedImage] = useState(null);
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [facingMode, setFacingMode] = useState("environment");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);
  const [omrType, setOMRType] = useState("standard");
  const [showInstructions, setShowInstructions] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [flashAvailable, setFlashAvailable] = useState(false);
  const [devices, setDevices] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [cameraInitialized, setCameraInitialized] = useState(false);

  // Enhanced OMR configurations with grid detection
  const omrConfigs = {
    standard: {
      width: 75,
      height: 92,
      name: "Standard OMR Sheet",
      aspectRatio: "3:4",
      gridRows: 100,
      gridCols: 4,
    },
    long: {
      width: 72,
      height: 95,
      name: "Long OMR Sheet",
      aspectRatio: "2.8:4",
      gridRows: 120,
      gridCols: 4,
    },
    compact: {
      width: 78,
      height: 89,
      name: "Compact OMR Sheet",
      aspectRatio: "3.2:4",
      gridRows: 80,
      gridCols: 4,
    },
  };

  // Improved cleanup function
  const forceCleanup = useCallback(() => {
    console.log("Force cleanup started...");

    // Turn off flash first
    setIsFlashOn(false);

    // Stop all tracks from the ref
    if (streamRef.current) {
      const tracks = streamRef.current.getTracks();
      tracks.forEach((track, index) => {
        console.log(
          `Stopping track ${index}: ${track.kind} - ${track.readyState}`
        );
        try {
          track.stop();
        } catch (e) {
          console.warn(`Error stopping track ${index}:`, e);
        }
      });
      streamRef.current = null;
    }

    // Clear video element properly
    if (videoRef.current) {
      const video = videoRef.current;
      video.pause();
      video.srcObject = null;

      // Remove all event listeners
      video.onloadedmetadata = null;
      video.onerror = null;
      video.onabort = null;
      video.oncanplay = null;
      video.onloadstart = null;

      // Force reload
      video.load();
    }

    // Reset all states
    setIsStreaming(false);
    setFlashAvailable(false);
    setCameraInitialized(false);

    console.log("Force cleanup completed");
  }, []);

  // Get available camera devices
  useEffect(() => {
    const initializeDevices = async () => {
      try {
        // Request permissions first
        const tempStream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        // Stop the temp stream immediately
        tempStream.getTracks().forEach((track) => track.stop());

        const deviceList = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = deviceList.filter(
          (device) => device.kind === "videoinput"
        );
        setDevices(videoDevices);
        console.log("Available cameras:", videoDevices.length);
      } catch (err) {
        console.error("Error getting devices:", err);
        setError("Camera permission required");
      }
    };

    initializeDevices();

    // Auto-hide instructions
    if (showInstructions) {
      const timer = setTimeout(() => {
        setShowInstructions(false);
      }, 5000);
      return () => clearTimeout(timer);
    }

    // Cleanup on unmount
    return () => {
      forceCleanup();
    };
  }, [showInstructions, forceCleanup]);

  const startCamera = useCallback(async () => {
    console.log("Starting camera...");

    try {
      setError(null);
      setIsLoading(true);

      // Force cleanup any existing streams
      forceCleanup();

      // Wait for cleanup to complete
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Check if video element is available
      if (!videoRef.current) {
        throw new Error("Video element not available");
      }

      // Updated constraints for better compatibility
      const constraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920, min: 640 },
          height: { ideal: 1080, min: 480 },
          frameRate: { ideal: 30, max: 60 },
          aspectRatio: { ideal: 16 / 9 },
        },
        audio: false,
      };

      console.log("Requesting camera with constraints:", constraints);
      const mediaStream = await navigator.mediaDevices.getUserMedia(
        constraints
      );

      if (!mediaStream) {
        throw new Error("Failed to get media stream");
      }

      console.log("Media stream obtained:", mediaStream.id);

      // Check if stream is active
      if (!mediaStream.active) {
        throw new Error("Media stream is not active");
      }

      streamRef.current = mediaStream;

      // Set up video element
      const video = videoRef.current;

      // Set up video properties
      video.muted = true;
      video.playsInline = true;
      video.autoplay = true;

      // Set source
      video.srcObject = mediaStream;

      // Return promise for video loading
      return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          console.error("Video loading timeout");
          reject(new Error("Video loading timeout"));
        }, 15000);

        const handleLoadedMetadata = async () => {
          console.log("Video metadata loaded");
          console.log(
            `Video dimensions: ${video.videoWidth}x${video.videoHeight}`
          );

          try {
            clearTimeout(timeoutId);

            // Ensure video can play
            if (video.paused) {
              await video.play();
            }

            console.log("Video playing successfully");

            // Check flash capability
            const videoTrack = mediaStream.getVideoTracks()[0];
            if (videoTrack?.getCapabilities) {
              const capabilities = videoTrack.getCapabilities();
              setFlashAvailable(!!capabilities.torch);
              console.log("Flash available:", !!capabilities.torch);
            }

            setIsStreaming(true);
            setCameraInitialized(true);
            setIsLoading(false);

            // Clean up event listeners
            video.onloadedmetadata = null;
            video.onerror = null;
            video.onabort = null;

            resolve(true);
          } catch (playErr) {
            clearTimeout(timeoutId);
            console.error("Video play error:", playErr);
            reject(playErr);
          }
        };

        const handleError = (err) => {
          console.error("Video error:", err);
          clearTimeout(timeoutId);
          video.onloadedmetadata = null;
          video.onerror = null;
          video.onabort = null;
          reject(new Error("Video loading failed"));
        };

        const handleAbort = () => {
          console.log("Video loading aborted");
          clearTimeout(timeoutId);
          video.onloadedmetadata = null;
          video.onerror = null;
          video.onabort = null;
          reject(new Error("Video loading aborted"));
        };

        // Set event handlers
        video.onloadedmetadata = handleLoadedMetadata;
        video.onerror = handleError;
        video.onabort = handleAbort;

        // If video is already loaded, call handler immediately
        if (video.readyState >= 1) {
          console.log("Video already has metadata, calling handler");
          handleLoadedMetadata();
        }
      });
    } catch (err) {
      console.error("Start camera error:", err);
      setError(`Camera failed: ${err.message}`);
      setIsStreaming(false);
      setIsLoading(false);
      setCameraInitialized(false);
      forceCleanup();
      throw err;
    }
  }, [facingMode, forceCleanup]);

  const stopCamera = useCallback(() => {
    console.log("Stopping camera...");
    forceCleanup();
  }, [forceCleanup]);

  const toggleFlash = async () => {
    if (streamRef.current && flashAvailable) {
      const track = streamRef.current.getVideoTracks()[0];
      if (track?.applyConstraints) {
        try {
          await track.applyConstraints({
            advanced: [{ torch: !isFlashOn }],
          });
          setIsFlashOn(!isFlashOn);
        } catch (err) {
          console.error("Flash error:", err);
          setError("Flash control failed");
          setTimeout(() => setError(null), 2000);
        }
      }
    }
  };

  const detectAndCropOMRGrid = () => {
    if (
      !videoRef.current ||
      !canvasRef.current ||
      !cropCanvasRef.current ||
      !isStreaming
    ) {
      setError("Camera not ready for scanning");
      return;
    }

    try {
      const canvas = canvasRef.current;
      const cropCanvas = cropCanvasRef.current;
      const video = videoRef.current;

      // Verify video dimensions
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        setError("Video not ready, please wait...");
        return;
      }

      console.log(
        "Scanning with video dimensions:",
        video.videoWidth,
        "x",
        video.videoHeight
      );

      // Set canvas dimensions
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0);

      const config = omrConfigs[omrType];

      // Calculate crop area
      const cropX = (canvas.width * (100 - config.width)) / 200;
      const cropY = (canvas.height * (100 - config.height)) / 200;
      const cropWidth = (canvas.width * config.width) / 100;
      const cropHeight = (canvas.height * config.height) / 100;

      // Create cropped image
      cropCanvas.width = cropWidth;
      cropCanvas.height = cropHeight;
      const cropCtx = cropCanvas.getContext("2d");

      cropCtx.imageSmoothingEnabled = false;
      cropCtx.drawImage(
        canvas,
        cropX,
        cropY,
        cropWidth,
        cropHeight,
        0,
        0,
        cropWidth,
        cropHeight
      );

      // Apply image enhancement
      const imageData = cropCtx.getImageData(0, 0, cropWidth, cropHeight);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        const contrast = 1.3;
        const brightness = 15;

        data[i] = Math.min(255, Math.max(0, contrast * data[i] + brightness));
        data[i + 1] = Math.min(
          255,
          Math.max(0, contrast * data[i + 1] + brightness)
        );
        data[i + 2] = Math.min(
          255,
          Math.max(0, contrast * data[i + 2] + brightness)
        );
      }

      cropCtx.putImageData(imageData, 0, 0);

      const croppedImageUrl = cropCanvas.toDataURL("image/jpeg", 0.95);

      setCroppedImage({
        url: croppedImageUrl,
        width: Math.round(cropWidth),
        height: Math.round(cropHeight),
        timestamp: new Date().toISOString(),
        omrType: config.name,
        gridRows: config.gridRows,
        gridCols: config.gridCols,
        quality: "Enhanced",
      });

      // Keep camera running for next scan
      console.log("OMR scan completed successfully - camera still active");

      // Haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }
    } catch (err) {
      console.error("Scanning error:", err);
      setError(`Scanning failed: ${err.message}`);
    }
  };

  const downloadOMR = () => {
    if (croppedImage) {
      const link = document.createElement("a");
      link.download = `OMR-${omrType}-${Date.now()}.jpg`;
      link.href = croppedImage.url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const retakeScan = useCallback(async () => {
    console.log("Retaking scan...");

    setError(null);

    // Clear the cropped image first
    setCroppedImage(null);

    // Check if camera is still running and active
    const isStreamActive =
      streamRef.current &&
      streamRef.current.active &&
      streamRef.current.getVideoTracks().length > 0 &&
      streamRef.current.getVideoTracks()[0].readyState === "live";

    console.log("Stream active:", isStreamActive);
    console.log("Camera initialized:", cameraInitialized);
    console.log("Is streaming:", isStreaming);

    if (isStreamActive && cameraInitialized && isStreaming) {
      console.log("Camera is still active, ready for next scan");

      // Verify video element is still working
      if (videoRef.current && videoRef.current.videoWidth > 0) {
        console.log("Video element is working fine");
        return;
      }
    }

    // If we get here, we need to restart the camera
    console.log("Camera needs to be restarted");

    try {
      setIsLoading(true);
      await startCamera();
      console.log("Camera restarted successfully");
    } catch (err) {
      console.error("Failed to restart camera:", err);
      setError("Failed to restart camera. Please try again.");
      setIsLoading(false);
    }
  }, [cameraInitialized, isStreaming, startCamera]);

  const switchCamera = useCallback(async () => {
    if (isLoading) return;

    console.log("Switching camera...");
    const newFacingMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(newFacingMode);

    // Force stop and restart with new facing mode
    forceCleanup();

    // Wait a bit longer for cleanup
    await new Promise((resolve) => setTimeout(resolve, 800));

    try {
      setIsLoading(true);
      await startCamera();
    } catch (err) {
      console.error("Camera switch failed:", err);
      setError("Camera switch failed. Please try again.");
    }
  }, [facingMode, isLoading, forceCleanup, startCamera]);

  const VerticalOMROverlay = () => {
    const config = omrConfigs[omrType];
    return (
      <div
        className="position-absolute top-0 start-0 w-100 h-100"
        style={{ pointerEvents: "none", zIndex: 10 }}
      >
        <div
          className="position-absolute w-100 h-100"
          style={{
            background: `
              linear-gradient(to right, 
                rgba(0,0,0,0.7) ${(100 - config.width) / 2}%, 
                transparent ${(100 - config.width) / 2}%, 
                transparent ${100 - (100 - config.width) / 2}%, 
                rgba(0,0,0,0.7) ${100 - (100 - config.width) / 2}%
              ),
              linear-gradient(to bottom, 
                rgba(0,0,0,0.7) ${(100 - config.height) / 2}%, 
                transparent ${(100 - config.height) / 2}%, 
                transparent ${100 - (100 - config.height) / 2}%, 
                rgba(0,0,0,0.7) ${100 - (100 - config.height) / 2}%
              )
            `,
          }}
        />

        <div
          className="position-absolute border border-success border-3 rounded"
          style={{
            left: `${(100 - config.width) / 2}%`,
            top: `${(100 - config.height) / 2}%`,
            width: `${config.width}%`,
            height: `${config.height}%`,
            boxShadow: "0 0 20px rgba(0, 255, 0, 0.5)",
            background: "rgba(0, 255, 0, 0.05)",
          }}
        >
          {/* Corner guides */}
          {[
            { top: "-3px", left: "-3px" },
            { top: "-3px", right: "-3px" },
            { bottom: "-3px", left: "-3px" },
            { bottom: "-3px", right: "-3px" },
          ].map((position, index) => (
            <div
              key={index}
              className="position-absolute bg-success rounded"
              style={{ ...position, width: "20px", height: "20px" }}
            />
          ))}

          {/* Grid overlay */}
          {showGrid && (
            <>
              {Array.from({ length: config.gridCols - 1 }).map((_, i) => (
                <div
                  key={`v-${i}`}
                  className="position-absolute"
                  style={{
                    left: `${(100 / config.gridCols) * (i + 1)}%`,
                    top: "5%",
                    bottom: "5%",
                    width: "1px",
                    borderLeft: "1px dashed rgba(255, 193, 7, 0.6)",
                  }}
                />
              ))}

              {Array.from({
                length: Math.min(15, Math.floor(config.gridRows / 8)),
              }).map((_, i) => (
                <div
                  key={`h-${i}`}
                  className="position-absolute"
                  style={{
                    top: `${10 + (80 / 15) * i}%`,
                    left: "5%",
                    right: "5%",
                    height: "1px",
                    borderTop: "1px dashed rgba(255, 193, 7, 0.4)",
                  }}
                />
              ))}
            </>
          )}

          {/* Center alignment line */}
          <div
            className="position-absolute"
            style={{
              left: "50%",
              top: "10%",
              bottom: "10%",
              width: "2px",
              borderLeft: "2px dashed rgba(0, 255, 0, 0.6)",
            }}
          />
        </div>

        {/* Instructions overlay */}
        {showInstructions && (
          <div
            className="position-absolute top-0 start-0 w-100 p-3"
            style={{ zIndex: 15 }}
          >
            <div className="bg-dark bg-opacity-90 text-white p-3 rounded shadow">
              <div className="d-flex justify-content-between align-items-start mb-2">
                <h6 className="mb-0 text-success">📱 OMR Scanner Ready</h6>
                <button
                  onClick={() => setShowInstructions(false)}
                  className="btn btn-sm btn-outline-light p-1"
                  style={{ lineHeight: 1 }}
                >
                  <X size={16} />
                </button>
              </div>
              <small>
                • Hold device steady in portrait mode
                <br />
                • Align OMR sheet within green frame
                <br />
                • Ensure good lighting for best results
                <br />
                • Grid lines help with alignment
                <br />• Tap to hide this message
              </small>
            </div>
          </div>
        )}

        {showInstructions && (
          <div
            className="position-absolute w-100 h-100"
            style={{ pointerEvents: "auto", zIndex: 5 }}
            onClick={() => setShowInstructions(false)}
          />
        )}
      </div>
    );
  };

  return (
    <div
      className="min-vh-100 bg-dark text-white"
      style={{ overflow: "hidden" }}
    >
      {/* Header */}
      <div className="bg-secondary py-2 px-3">
        <div className="d-flex align-items-center justify-content-between">
          <h5 className="mb-0 d-flex align-items-center">
            <FileText size={20} className="me-2" />
            Enhanced OMR Scanner
          </h5>
          <select
            value={omrType}
            onChange={(e) => setOMRType(e.target.value)}
            className="form-select form-select-sm"
            style={{ width: "auto", fontSize: "12px" }}
            disabled={isLoading}
          >
            <option value="standard">Standard</option>
            <option value="long">Long Sheet</option>
            <option value="compact">Compact</option>
          </select>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="alert alert-warning m-3 py-2" role="alert">
          <AlertTriangle size={16} className="me-2" />
          <small>{error}</small>
        </div>
      )}

      {!croppedImage ? (
        <>
          {/* Camera View */}
          <div
            className="position-relative bg-black d-flex align-items-center justify-content-center"
            style={{ height: "calc(100vh - 160px)" }}
          >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-100 h-100 ${isStreaming ? "d-block" : "d-none"}`}
              style={{ objectFit: "cover" }}
            />

            {isStreaming && cameraInitialized && <VerticalOMROverlay />}

            {/* Loading State */}
            {isLoading && (
              <div className="position-absolute top-50 start-50 translate-middle text-center">
                <div className="spinner-border text-success mb-3" role="status">
                  <span className="visually-hidden">Starting camera...</span>
                </div>
                <h6 className="text-light">Initializing Camera...</h6>
                <small className="text-muted">Please wait</small>
              </div>
            )}

            {/* Ready State */}
            {!isStreaming && !isLoading && (
              <div className="text-center p-4">
                <FileText size={80} className="mb-4 text-success opacity-75" />
                <h4 className="mb-3 text-light">Ready to Scan OMR</h4>
                <p className="text-muted mb-4">
                  High-quality scanning with grid detection
                </p>
                <button
                  onClick={startCamera}
                  className="btn btn-success btn-lg px-4"
                  disabled={isLoading}
                >
                  <Camera className="me-2" size={20} />
                  Start Camera
                </button>
              </div>
            )}
          </div>

          {/* Control Panel */}
          <div className="bg-secondary p-3">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div className="d-flex gap-2">
                <button
                  onClick={toggleFlash}
                  disabled={!isStreaming || !flashAvailable || isLoading}
                  className={`btn btn-sm ${
                    isFlashOn ? "btn-warning" : "btn-outline-light"
                  }`}
                  title="Toggle Flash"
                >
                  {isFlashOn ? <Zap size={16} /> : <ZapOff size={16} />}
                </button>

                <button
                  onClick={switchCamera}
                  disabled={isLoading}
                  className="btn btn-sm btn-outline-light"
                  title="Switch Camera"
                >
                  <RotateCcw size={16} />
                </button>

                <button
                  onClick={() => setShowGrid(!showGrid)}
                  className={`btn btn-sm ${
                    showGrid ? "btn-info" : "btn-outline-light"
                  }`}
                  title="Toggle Grid"
                >
                  <Grid3x3 size={16} />
                </button>
              </div>

              <div className="d-flex gap-2">
                <button
                  onClick={isStreaming ? stopCamera : startCamera}
                  disabled={isLoading}
                  className={`btn btn-sm ${
                    isStreaming ? "btn-danger" : "btn-primary"
                  }`}
                >
                  {isLoading ? "Wait..." : isStreaming ? "Stop" : "Start"}
                </button>
              </div>
            </div>

            <button
              onClick={detectAndCropOMRGrid}
              disabled={!isStreaming || !cameraInitialized || isLoading}
              className="btn btn-success btn-lg w-100 fw-bold py-3"
            >
              <Camera className="me-2" size={24} />
              SCAN OMR SHEET
            </button>
          </div>
        </>
      ) : (
        /* Results View */
        <div
          className="p-3"
          style={{ height: "calc(100vh - 60px)", overflowY: "auto" }}
        >
          <div className="text-center mb-4">
            <CheckCircle size={32} className="text-success mb-2" />
            <h4 className="text-success mb-1">Scan Successful!</h4>
            <small className="text-muted">Enhanced processing applied</small>
          </div>

          <div className="bg-black rounded mb-4 p-2">
            <img
              src={croppedImage.url}
              alt="Scanned OMR"
              className="img-fluid w-100 rounded"
              style={{ maxHeight: "45vh", objectFit: "contain" }}
            />
          </div>

          <div className="card bg-secondary mb-4">
            <div className="card-body py-3">
              <h6 className="text-warning mb-3">📊 Scan Information</h6>
              <div className="row g-2 small">
                <div className="col-6">
                  <strong>Type:</strong>
                </div>
                <div className="col-6">{croppedImage.omrType}</div>

                <div className="col-6">
                  <strong>Resolution:</strong>
                </div>
                <div className="col-6 font-monospace">
                  {croppedImage.width}×{croppedImage.height}
                </div>

                <div className="col-6">
                  <strong>Grid:</strong>
                </div>
                <div className="col-6">
                  {croppedImage.gridRows}×{croppedImage.gridCols}
                </div>

                <div className="col-6">
                  <strong>Quality:</strong>
                </div>
                <div className="col-6 text-success">Enhanced (95%)</div>

                <div className="col-12 mt-2 pt-2 border-top">
                  <strong>Timestamp:</strong>{" "}
                  {new Date(croppedImage.timestamp).toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          <div className="d-grid gap-3">
            <button
              onClick={downloadOMR}
              className="btn btn-primary btn-lg fw-bold py-3"
            >
              <Download className="me-2" size={20} />
              Download OMR Scan
            </button>

            <button
              onClick={retakeScan}
              className="btn btn-outline-light py-2"
              disabled={isLoading}
            >
              <Camera className="me-2" size={18} />
              {isLoading ? "Loading..." : "Scan Another Sheet"}
            </button>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: "none" }} />
      <canvas ref={cropCanvasRef} style={{ display: "none" }} />
    </div>
  );
};

export default EnhancedMobileOMRScanner;
