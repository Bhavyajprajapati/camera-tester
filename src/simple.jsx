import React, { useState, useRef, useEffect, useCallback } from "react";
import { Camera, Zap, ZapOff, Download, RotateCcw } from "lucide-react";

const SimpleOMRScanner = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [croppedImage, setCroppedImage] = useState(null);
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [flashAvailable, setFlashAvailable] = useState(false);

  const cleanup = useCallback(() => {
    setIsFlashOn(false);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
    setFlashAvailable(false);
  }, []);

  useEffect(() => {
    startCamera();
    return () => cleanup();
  }, [cleanup]);

  const startCamera = async () => {
    try {
      cleanup();
      await new Promise((resolve) => setTimeout(resolve, 300));

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 3840 },
          height: { ideal: 2160 },
        },
        audio: false,
      });

      streamRef.current = stream;
      const video = videoRef.current;
      video.srcObject = stream;
      video.play();

      const track = stream.getVideoTracks()[0];
      if (track?.getCapabilities) {
        const capabilities = track.getCapabilities();
        setFlashAvailable(!!capabilities.torch);
      }

      setIsStreaming(true);
    } catch (err) {
      console.error("Camera error:", err);
    }
  };

  const toggleFlash = async () => {
    if (streamRef.current && flashAvailable) {
      const track = streamRef.current.getVideoTracks()[0];
      try {
        await track.applyConstraints({
          advanced: [{ torch: !isFlashOn }],
        });
        setIsFlashOn(!isFlashOn);
      } catch (err) {
        console.error("Flash error:", err);
      }
    }
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current || !isStreaming) return;

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      // Capture at full video resolution
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0);

      // Auto-detect A4 sheet (1:1.414 aspect ratio)
      const sourceWidth = canvas.width;
      const sourceHeight = canvas.height;
      const a4Ratio = 1.414;

      // Calculate centered A4 crop area
      let cropWidth, cropHeight;
      if (sourceHeight / sourceWidth > a4Ratio) {
        // Image is taller - fit to width
        cropWidth = sourceWidth * 0.9;
        cropHeight = cropWidth * a4Ratio;
      } else {
        // Image is wider - fit to height
        cropHeight = sourceHeight * 0.9;
        cropWidth = cropHeight / a4Ratio;
      }

      const cropX = (sourceWidth - cropWidth) / 2;
      const cropY = (sourceHeight - cropHeight) / 2;

      // Create high-res cropped image
      const cropCanvas = document.createElement("canvas");
      const targetWidth = Math.max(2000, Math.round(cropWidth));
      const targetHeight = Math.round(targetWidth * a4Ratio);

      cropCanvas.width = targetWidth;
      cropCanvas.height = targetHeight;
      const cropCtx = cropCanvas.getContext("2d");

      cropCtx.drawImage(
        canvas,
        cropX,
        cropY,
        cropWidth,
        cropHeight,
        0,
        0,
        targetWidth,
        targetHeight
      );

      // Enhance contrast for OMR marks
      const imageData = cropCtx.getImageData(0, 0, targetWidth, targetHeight);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
        const enhanced = brightness > 128 ? 255 : brightness * 0.8;
        data[i] = data[i + 1] = data[i + 2] = enhanced;
      }
      cropCtx.putImageData(imageData, 0, 0);

      const imageUrl = cropCanvas.toDataURL("image/png");
      setCroppedImage({
        url: imageUrl,
        width: targetWidth,
        height: targetHeight,
        timestamp: new Date().toISOString(),
      });

      if (navigator.vibrate) navigator.vibrate(100);
    } catch (err) {
      console.error("Capture error:", err);
    }
  };

  const downloadImage = () => {
    if (croppedImage) {
      const link = document.createElement("a");
      link.download = `OMR-${Date.now()}.png`;
      link.href = croppedImage.url;
      link.click();
    }
  };

  const retake = () => {
    setCroppedImage(null);
  };

  return (
    <div className="min-vh-100 bg-dark text-white d-flex flex-column">
      {!croppedImage ? (
        <>
          {/* Camera View */}
          <div className="flex-grow-1 position-relative bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-100 h-100"
              style={{ objectFit: "cover" }}
            />
          </div>

          {/* Controls */}
          <div className="bg-secondary p-3">
            <div className="d-flex gap-3 justify-content-center">
              <button
                onClick={toggleFlash}
                disabled={!flashAvailable}
                className={`btn btn-lg ${
                  isFlashOn ? "btn-warning" : "btn-outline-light"
                }`}
                style={{ width: "80px" }}
              >
                {isFlashOn ? <Zap size={24} /> : <ZapOff size={24} />}
              </button>

              <button
                onClick={capturePhoto}
                disabled={!isStreaming}
                className="btn btn-success btn-lg px-5"
              >
                <Camera size={28} className="me-2" />
                Capture
              </button>
            </div>
          </div>
        </>
      ) : (
        /* Results View */
        <div className="flex-grow-1 d-flex flex-column p-3">
          <div className="text-center mb-3">
            <h4 className="text-success">✓ Captured</h4>
            <small className="text-muted">
              {croppedImage.width}×{croppedImage.height}
            </small>
          </div>

          <div className="flex-grow-1 bg-black rounded mb-3 p-2 d-flex align-items-center justify-content-center">
            <img
              src={croppedImage.url}
              alt="Scanned OMR"
              className="img-fluid rounded"
              style={{ maxHeight: "60vh", maxWidth: "100%" }}
            />
          </div>

          <div className="d-flex gap-3">
            <button
              onClick={retake}
              className="btn btn-outline-light flex-grow-1"
            >
              <RotateCcw size={20} className="me-2" />
              Retake
            </button>
            <button
              onClick={downloadImage}
              className="btn btn-primary flex-grow-1"
            >
              <Download size={20} className="me-2" />
              Download
            </button>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
};

export default SimpleOMRScanner;
