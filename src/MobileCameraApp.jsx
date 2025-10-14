import React, { useState, useRef, useEffect, useCallback } from "react";
import { Camera, Zap, ZapOff, RotateCcw, Download } from "lucide-react";

const OMR_ASPECT_RATIO = 1 / 1.414;

const MobileCameraApp = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const previewBoxRef = useRef(null);
  const streamRef = useRef(null);

  const [capturedImage, setCapturedImage] = useState(null);
  const [isReinitializing, setIsReinitializing] = useState(false);
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [flashAvailable, setFlashAvailable] = useState(false);
  const [error, setError] = useState(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
    setFlashAvailable(false);
    setIsFlashOn(false);
  }, []);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      if (streamRef.current) return;

      const constraints = {
        video: {
          facingMode: "environment",
          width: { ideal: 3840 }, // 4K width for maximum clarity
          height: { ideal: 2160 }, // 4K height for maximum clarity
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      const video = videoRef.current;
      if (!video) return;

      video.srcObject = stream;
      video.playsInline = true;
      video.muted = true;

      await new Promise((resolve, reject) => {
        video.onloadedmetadata = async () => {
          try {
            await video.play();
            const track = stream.getVideoTracks()[0];
            const caps = track.getCapabilities?.() || {};
            setFlashAvailable(Boolean(caps.torch || caps.fillLightMode));
            setIsStreaming(true);
            resolve();
          } catch (err) {
            reject(err);
          }
        };
        video.onerror = reject;
      });
    } catch (err) {
      console.error("Camera error:", err);
      if (
        err.name === "NotAllowedError" ||
        err.name === "PermissionDeniedError"
      ) {
        setError(
          "Camera permission denied. Please enable it in your browser settings."
        );
      } else {
        setError(
          "Failed to access camera. Please ensure it's not in use by another app."
        );
      }
      stopCamera();
    } finally {
      setIsReinitializing(false);
    }
  }, [stopCamera]);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const toggleFlash = async () => {
    if (streamRef.current && flashAvailable) {
      const track = streamRef.current.getVideoTracks()[0];
      try {
        await track.applyConstraints({ advanced: [{ torch: !isFlashOn }] });
        setIsFlashOn(!isFlashOn);
      } catch (err) {
        console.error("Flash error:", err);
      }
    }
  };

  const optimizeImageSize = async (
    dataUrl,
    targetMinKB = 1536, // 1.5 MB
    targetMaxKB = 2048 // 2 MB
  ) => {
    const img = await new Promise((resolve) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.src = dataUrl;
    });

    const tempCanvas = document.createElement("canvas");
    const tempCtx = tempCanvas.getContext("2d");

    let scale = 1.0;
    let resultDataUrl = dataUrl;
    let iterations = 0;
    const maxIterations = 15;

    while (iterations < maxIterations) {
      const width = Math.floor(img.width * scale);
      const height = Math.floor(img.height * scale);

      tempCanvas.width = width;
      tempCanvas.height = height;
      tempCtx.drawImage(img, 0, 0, width, height);

      resultDataUrl = tempCanvas.toDataURL("image/png");
      const base64Data = resultDataUrl.split(",")[1];
      const sizeKB = Math.ceil((base64Data.length * 3) / 4 / 1024);

      if (sizeKB >= targetMinKB && sizeKB <= targetMaxKB) {
        break;
      }

      if (sizeKB > targetMaxKB) {
        // Reduce scale to decrease file size
        if (sizeKB > targetMaxKB * 1.5) {
          scale *= 0.85;
        } else {
          scale *= 0.95;
        }
      } else if (sizeKB < targetMinKB) {
        // Increase scale to increase file size (if possible)
        if (scale >= 1.0) {
          // Already at max resolution, accept this size
          break;
        } else {
          scale = Math.min(1.0, scale * 1.05);
        }
      } else {
        break;
      }

      iterations++;
    }

    return resultDataUrl;
  };

  const capturePhoto = async () => {
    if (
      !videoRef.current ||
      !previewBoxRef.current ||
      !canvasRef.current ||
      !isStreaming
    )
      return;

    const video = videoRef.current;
    const previewBox = previewBoxRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;
    const previewWidth = previewBox.offsetWidth;
    const previewHeight = previewBox.offsetHeight;

    // Calculate the visible area in the video that matches the preview box
    const videoAspectRatio = videoWidth / videoHeight;
    const previewAspectRatio = previewWidth / previewHeight;

    let sx = 0,
      sy = 0,
      sWidth = 0,
      sHeight = 0;

    if (videoAspectRatio > previewAspectRatio) {
      // Video is wider, crop sides
      sHeight = videoHeight;
      sWidth = videoHeight * previewAspectRatio;
      sx = (videoWidth - sWidth) / 2;
      sy = 0;
    } else {
      // Video is taller, crop top/bottom
      sWidth = videoWidth;
      sHeight = videoWidth / previewAspectRatio;
      sx = 0;
      sy = (videoHeight - sHeight) / 2;
    }

    // Set canvas size to match the cropped area (high resolution)
    canvas.width = sWidth;
    canvas.height = sHeight;

    // Draw the exact visible portion
    ctx.drawImage(
      video,
      sx,
      sy,
      sWidth,
      sHeight,
      0,
      0,
      canvas.width,
      canvas.height
    );

    const rawDataUrl = canvas.toDataURL("image/png");

    // Optimize image to 1MB-2MB range
    const optimizedDataUrl = await optimizeImageSize(rawDataUrl);

    setCapturedImage(optimizedDataUrl);
    if (navigator.vibrate) navigator.vibrate(100);
  };

  const downloadImage = () => {
    if (!capturedImage) return;

    const link = document.createElement("a");
    link.href = capturedImage;
    link.download = `omr_scan_${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const retakePhoto = async () => {
    setCapturedImage(null);
    setError(null);
    setIsReinitializing(true);
    stopCamera();
    await new Promise((r) => setTimeout(r, 300));
    await startCamera();
  };

  return (
    <>
      <div className="camera-app-container">
        <div className="camera-header">
          <h5 className="mb-0 d-flex align-items-center">
            <Camera size={20} className="me-2" /> OMR Scanner
          </h5>
        </div>

        {error && (
          <div className="alert alert-danger text-center py-2 m-0 rounded-0">
            {error}
          </div>
        )}

        {!capturedImage ? (
          <>
            <div className="camera-preview-area">
              <div className="camera-overlay">
                <div
                  ref={previewBoxRef}
                  className="omr-preview-box"
                  style={{ aspectRatio: OMR_ASPECT_RATIO }}
                >
                  <video ref={videoRef} autoPlay playsInline muted />
                </div>
              </div>
              {(!isStreaming || isReinitializing) && (
                <div className="loading-indicator">
                  <div className="spinner-border text-light mb-3" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="text-light">
                    {isReinitializing
                      ? "Reinitializing Camera..."
                      : "Initializing Camera..."}
                  </p>
                </div>
              )}
            </div>
            <div className="camera-controls">
              <button
                onClick={toggleFlash}
                disabled={!flashAvailable || !isStreaming}
                className={`btn btn-control ${
                  isFlashOn ? "btn-warning" : "btn-outline-light"
                }`}
              >
                {isFlashOn ? <Zap size={24} /> : <ZapOff size={24} />}
              </button>
              <button
                onClick={capturePhoto}
                disabled={!isStreaming || isReinitializing}
                className="btn btn-light btn-lg capture-button"
              >
                <Camera size={32} />
              </button>
              <div style={{ width: "48px" }}></div>
            </div>
          </>
        ) : (
          <>
            <div className="image-preview-area">
              <img
                src={capturedImage}
                alt="Captured OMR"
                className="captured-image"
              />
            </div>
            <div className="captured-controls">
              <button
                onClick={downloadImage}
                className="btn btn-success w-100 mb-3 btn-lg"
              >
                <Download className="me-2" size={20} /> Download Image
              </button>
              <button
                onClick={retakePhoto}
                className="btn btn-outline-danger w-100"
              >
                <RotateCcw className="me-2" size={18} /> Retake
              </button>
            </div>
          </>
        )}
        <canvas ref={canvasRef} style={{ display: "none" }} />
      </div>
      <style>{`
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body { 
            overflow: hidden; 
            position: fixed; 
            width: 100%; 
            height: 100%; 
            -webkit-overflow-scrolling: touch;
          }
          .camera-app-container { 
            background-color: #212529; 
            color: white; 
            height: 100vh; 
            height: 100dvh;
            width: 100vw; 
            overflow: hidden; 
            display: flex; 
            flex-direction: column; 
            position: fixed;
            top: 0;
            left: 0;
          }
          .camera-header { 
            background-color: #495057; 
            padding: 0.75rem 1rem; 
            flex-shrink: 0;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          }
          .camera-preview-area { 
            flex-grow: 1; 
            position: relative; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            overflow: hidden; 
            background-color: #000; 
          }
          .camera-overlay { 
            position: absolute; 
            top: 0; 
            left: 0; 
            width: 100%; 
            height: 100%; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            box-shadow: 0 0 0 100vmax rgba(0,0,0,0.7); 
          }
          .omr-preview-box { 
            width: 85%; 
            max-width: 500px;
            border: 3px solid rgba(255, 255, 255, 0.9); 
            border-radius: 12px; 
            overflow: hidden; 
            box-shadow: 0 0 20px rgba(255,255,255,0.3);
            position: relative;
          }
          video { 
            width: 100%; 
            height: 100%; 
            object-fit: cover; 
            display: block;
          }
          .loading-indicator { 
            position: absolute; 
            top: 50%; 
            left: 50%; 
            transform: translate(-50%, -50%); 
            text-align: center; 
            z-index: 10; 
            background: rgba(0,0,0,0.7); 
            padding: 30px; 
            border-radius: 15px; 
          }
          .camera-controls { 
            flex-shrink: 0; 
            background-color: #343a40; 
            padding: 1.25rem 1.5rem;
            padding-bottom: max(1.25rem, env(safe-area-inset-bottom));
            display: flex; 
            justify-content: space-between; 
            align-items: center;
            box-shadow: 0 -2px 10px rgba(0,0,0,0.3);
            min-height: 110px;
          }
          .btn-control {
            width: 48px;
            height: 48px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            padding: 0;
          }
          .capture-button { 
            border-radius: 50%; 
            width: 70px; 
            height: 70px; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            padding: 0; 
            border: 4px solid #495057; 
            box-shadow: 0 0 0 3px white, 0 4px 12px rgba(0,0,0,0.3); 
            transition: transform 0.1s;
          }
          .capture-button:active {
            transform: scale(0.95);
          }
          .image-preview-area { 
            flex-grow: 1; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            background-color: #000; 
            padding: 1rem; 
            overflow: auto; 
          }
          .captured-image { 
            max-width: 100%; 
            max-height: 100%; 
            border-radius: 8px; 
            box-shadow: 0 4px 20px rgba(0,0,0,0.5);
          }
          .captured-controls { 
            flex-shrink: 0; 
            background-color: #343a40; 
            padding: 1.25rem 1.5rem;
            padding-bottom: max(1.25rem, env(safe-area-inset-bottom));
            min-height: 140px;
          }
          .btn { 
            font-weight: 500; 
            transition: all 0.2s;
          }
          .btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }
          .alert {
            border-radius: 0;
            font-size: 0.9rem;
          }
        `}</style>
    </>
  );
};

export default MobileCameraApp;
