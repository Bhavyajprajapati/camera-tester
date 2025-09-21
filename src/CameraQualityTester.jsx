import React, { useState, useRef, useEffect } from "react";
import {
  Camera,
  Download,
  Grid3X3,
  Zap,
  ZapOff,
  RotateCcw,
  Settings,
  CheckCircle,
  AlertTriangle,
  FileText,
} from "lucide-react";

const OMRScanner = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const cropCanvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [croppedImage, setCroppedImage] = useState(null);
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [facingMode, setFacingMode] = useState("environment");
  const [resolution, setResolution] = useState({ width: 1920, height: 1080 });
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);
  const [isOMRAligned, setIsOMRAligned] = useState(false);
  const [gridType, setGridType] = useState("a4"); // a4, a3, letter

  // Grid configurations for vertical OMR sheet sizes
  const gridConfigs = {
    a4: { width: 50, height: 90, name: "A4 OMR Sheet (Vertical)" },
    a3: { width: 55, height: 92, name: "A3 OMR Sheet (Vertical)" },
    letter: { width: 52, height: 88, name: "Letter Size OMR (Vertical)" },
    custom: { width: 48, height: 85, name: "Custom OMR Size (Vertical)" },
  };

  useEffect(() => {
    const getDevices = async () => {
      try {
        const deviceList = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = deviceList.filter(
          (device) => device.kind === "videoinput"
        );
      } catch (err) {
        console.error("Error getting devices:", err);
      }
    };
    getDevices();
  }, []);

  const startCamera = async () => {
    try {
      setError(null);
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      const constraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: resolution.width },
          height: { ideal: resolution.height },
          frameRate: { ideal: 30 },
        },
        audio: false,
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(
        constraints
      );
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }
      setStream(mediaStream);
      setIsStreaming(true);
    } catch (err) {
      setError(`Camera error: ${err.message}`);
      console.error("Error accessing camera:", err);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
      setIsStreaming(false);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const toggleFlash = async () => {
    if (stream) {
      const track = stream.getVideoTracks()[0];
      if (track && track.getCapabilities && track.applyConstraints) {
        try {
          const capabilities = track.getCapabilities();
          if (capabilities.torch) {
            await track.applyConstraints({
              advanced: [{ torch: !isFlashOn }],
            });
            setIsFlashOn(!isFlashOn);
          } else {
            setError("Flash/torch not supported on this device");
          }
        } catch (err) {
          setError("Flash control not available");
        }
      }
    }
  };

  const captureAndCropImage = () => {
    if (videoRef.current && canvasRef.current && cropCanvasRef.current) {
      const canvas = canvasRef.current;
      const cropCanvas = cropCanvasRef.current;
      const video = videoRef.current;

      // Set canvas size to video size
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0);

      // Get the current grid configuration
      const config = gridConfigs[gridType];
      const videoElement = videoRef.current;
      const rect = videoElement.getBoundingClientRect();

      // Calculate crop area based on grid overlay
      const cropX = (canvas.width * (100 - config.width)) / 200; // Center horizontally
      const cropY = (canvas.height * (100 - config.height)) / 200; // Center vertically
      const cropWidth = (canvas.width * config.width) / 100;
      const cropHeight = (canvas.height * config.height) / 100;

      // Create cropped image
      cropCanvas.width = cropWidth;
      cropCanvas.height = cropHeight;
      const cropCtx = cropCanvas.getContext("2d");

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

      // Store both images
      const fullImageUrl = canvas.toDataURL("image/jpeg", 0.9);
      const croppedImageUrl = cropCanvas.toDataURL("image/jpeg", 0.9);

      setCapturedImage({
        url: fullImageUrl,
        width: canvas.width,
        height: canvas.height,
        timestamp: new Date().toISOString(),
      });

      setCroppedImage({
        url: croppedImageUrl,
        width: cropWidth,
        height: cropHeight,
        timestamp: new Date().toISOString(),
      });
    }
  };

  const downloadCroppedImage = () => {
    if (croppedImage) {
      const link = document.createElement("a");
      link.download = `OMR-scan-${Date.now()}.jpg`;
      link.href = croppedImage.url;
      link.click();
    }
  };

  const switchCamera = () => {
    const newFacingMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(newFacingMode);
    if (isStreaming) startCamera();
  };

  const OMRGridOverlay = () => {
    const config = gridConfigs[gridType];
    return (
      <div
        className="position-absolute top-0 start-0 w-100 h-100"
        style={{ pointerEvents: "none", zIndex: 10 }}
      >
        {/* Dark overlay outside the OMR area */}
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

        {/* OMR Sheet Outline */}
        <div
          className="position-absolute border border-success border-3"
          style={{
            left: `${(100 - config.width) / 2}%`,
            top: `${(100 - config.height) / 2}%`,
            width: `${config.width}%`,
            height: `${config.height}%`,
            boxShadow: "0 0 20px rgba(0, 255, 0, 0.5)",
          }}
        >
          {/* Corner indicators */}
          <div
            className="position-absolute bg-success"
            style={{ top: "-3px", left: "-3px", width: "20px", height: "20px" }}
          />
          <div
            className="position-absolute bg-success"
            style={{
              top: "-3px",
              right: "-3px",
              width: "20px",
              height: "20px",
            }}
          />
          <div
            className="position-absolute bg-success"
            style={{
              bottom: "-3px",
              left: "-3px",
              width: "20px",
              height: "20px",
            }}
          />
          <div
            className="position-absolute bg-success"
            style={{
              bottom: "-3px",
              right: "-3px",
              width: "20px",
              height: "20px",
            }}
          />
        </div>

        {/* Instruction Text */}
        <div
          className="position-absolute top-0 start-50 translate-middle-x mt-3 text-center"
          style={{ zIndex: 15 }}
        >
          <div className="bg-dark bg-opacity-75 text-white px-3 py-2 rounded">
            <small className="fw-bold">
              📄 Align VERTICAL OMR sheet within the green frame
            </small>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-vh-100 bg-dark text-white">
      <div className="container-fluid py-4">
        <div className="row justify-content-center">
          <div className="col-12">
            <h1 className="text-center mb-4 display-4 fw-bold">
              <FileText className="me-3" size={48} />
              OMR Sheet Scanner
            </h1>

            {error && (
              <div
                className="alert alert-danger alert-dismissible"
                role="alert"
              >
                <strong>Error:</strong> {error}
              </div>
            )}

            <div className="row g-4">
              {/* Camera Section */}
              <div className="col-lg-8">
                <div className="card bg-secondary text-white h-100">
                  <div className="card-header">
                    <h3 className="card-title mb-0 d-flex align-items-center justify-content-between">
                      <div>
                        <Camera className="me-2" size={24} />
                        Live Camera Feed
                      </div>
                      <div className="d-flex align-items-center">
                        {isStreaming && (
                          <span
                            className={`badge ${
                              isOMRAligned ? "bg-success" : "bg-warning"
                            } d-flex align-items-center gap-1`}
                          >
                            {isOMRAligned ? (
                              <CheckCircle size={16} />
                            ) : (
                              <AlertTriangle size={16} />
                            )}
                            {isOMRAligned ? "OMR Aligned" : "Align OMR Sheet"}
                          </span>
                        )}
                      </div>
                    </h3>
                  </div>
                  <div className="card-body">
                    {/* Controls */}
                    <div className="row mb-4">
                      <div className="col-md-8">
                        <div className="d-flex flex-wrap gap-2 mb-3">
                          <button
                            onClick={isStreaming ? stopCamera : startCamera}
                            className={`btn ${
                              isStreaming ? "btn-danger" : "btn-success"
                            } d-flex align-items-center gap-2`}
                          >
                            <Camera size={18} />
                            {isStreaming ? "Stop Scanner" : "Start Scanner"}
                          </button>

                          <button
                            onClick={switchCamera}
                            disabled={!isStreaming}
                            className="btn btn-primary d-flex align-items-center gap-2"
                          >
                            <RotateCcw size={18} />
                            Switch Camera
                          </button>

                          <button
                            onClick={toggleFlash}
                            disabled={!isStreaming}
                            className={`btn ${
                              isFlashOn ? "btn-warning" : "btn-outline-warning"
                            } d-flex align-items-center gap-2`}
                          >
                            {isFlashOn ? (
                              <Zap size={18} />
                            ) : (
                              <ZapOff size={18} />
                            )}
                            Flash
                          </button>
                        </div>
                      </div>
                      <div className="col-md-4">
                        <label className="form-label fw-semibold">
                          OMR Sheet Size:
                        </label>
                        <select
                          value={gridType}
                          onChange={(e) => setGridType(e.target.value)}
                          className="form-select"
                        >
                          <option value="a4">A4 OMR Sheet (Vertical)</option>
                          <option value="a3">A3 OMR Sheet (Vertical)</option>
                          <option value="letter">Letter Size (Vertical)</option>
                          <option value="custom">Custom Size (Vertical)</option>
                        </select>
                      </div>
                    </div>

                    {/* Camera Preview with OMR Grid */}
                    <div
                      className="position-relative bg-black rounded overflow-hidden mb-4"
                      style={{
                        height: "600px",
                        minHeight: "600px",
                        border: "3px solid #28a745",
                      }}
                    >
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-100 h-100"
                        style={{
                          display: isStreaming ? "block" : "none",
                          objectFit: "cover",
                        }}
                      />
                      {showGrid && isStreaming && <OMRGridOverlay />}
                      {!isStreaming && (
                        <div className="position-absolute top-50 start-50 translate-middle text-center">
                          <div className="text-muted">
                            <FileText size={100} className="mb-3 opacity-50" />
                            <h3 className="mb-2">OMR Scanner Ready</h3>
                            <p className="lead">
                              Start camera to scan your OMR sheet
                            </p>
                            <div className="alert alert-info d-inline-block">
                              <small>
                                <strong>Vertical OMR Scanning Tips:</strong>
                                <br />
                                • Hold OMR sheet in PORTRAIT orientation
                                <br />
                                • Place sheet flat with good lighting
                                <br />
                                • Align all 4 corners within green frame
                                <br />• Keep text/bubbles clearly visible
                              </small>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Capture Instructions and Button */}
                    <div className="alert alert-info mb-3">
                      <div className="d-flex align-items-center gap-2">
                        <AlertTriangle size={20} />
                        <div>
                          <strong>Vertical OMR Scanning Instructions:</strong>
                          <br />
                          1. Hold OMR sheet in PORTRAIT (vertical) orientation
                          <br />
                          2. Place within the green frame - all corners must be
                          visible
                          <br />
                          3. Ensure question numbers and bubble rows are clearly
                          aligned
                          <br />
                          4. Image will be auto-cropped to OMR area only
                        </div>
                      </div>
                    </div>

                    <div className="d-grid">
                      <button
                        onClick={captureAndCropImage}
                        disabled={!isStreaming}
                        className="btn btn-lg btn-success fw-bold py-3"
                      >
                        📸 SCAN OMR SHEET
                      </button>
                    </div>

                    <canvas ref={canvasRef} style={{ display: "none" }} />
                    <canvas ref={cropCanvasRef} style={{ display: "none" }} />
                  </div>
                </div>
              </div>

              {/* Results Section */}
              <div className="col-lg-4">
                <div className="card bg-secondary text-white h-100">
                  <div className="card-header">
                    <h3 className="card-title mb-0 d-flex align-items-center">
                      <Settings className="me-2" size={24} />
                      Scanned OMR Result
                    </h3>
                  </div>
                  <div className="card-body d-flex flex-column">
                    {croppedImage ? (
                      <div className="flex-grow-1 d-flex flex-column">
                        {/* Cropped OMR Preview */}
                        <div className="bg-black rounded overflow-hidden mb-3 flex-shrink-0">
                          <img
                            src={croppedImage.url}
                            alt="Scanned OMR"
                            className="img-fluid w-100"
                            style={{ maxHeight: "350px", objectFit: "contain" }}
                          />
                        </div>

                        {/* Scan Information */}
                        <div className="bg-dark rounded p-3 mb-3 flex-grow-1">
                          <h5 className="text-success mb-3">
                            ✅ OMR Scan Complete
                          </h5>

                          <div className="row g-2">
                            <div className="col-6">
                              <strong className="text-warning">
                                OMR Size:
                              </strong>
                            </div>
                            <div className="col-6">
                              {gridConfigs[gridType].name}
                            </div>

                            <div className="col-6">
                              <strong className="text-warning">
                                Resolution:
                              </strong>
                            </div>
                            <div className="col-6 font-monospace">
                              {Math.round(croppedImage.width)}×
                              {Math.round(croppedImage.height)}
                            </div>

                            <div className="col-6">
                              <strong className="text-warning">
                                File Size:
                              </strong>
                            </div>
                            <div className="col-6 font-monospace">
                              {(
                                (croppedImage.url.length * 3) /
                                4 /
                                1024
                              ).toFixed(0)}{" "}
                              KB
                            </div>

                            <div className="col-12 mt-2">
                              <strong className="text-warning">Scanned:</strong>
                              <div className="small font-monospace text-light">
                                {new Date(
                                  croppedImage.timestamp
                                ).toLocaleString()}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="d-grid">
                          <button
                            onClick={downloadCroppedImage}
                            className="btn btn-primary btn-lg fw-bold d-flex align-items-center justify-content-center gap-2"
                          >
                            <Download size={20} />
                            Download OMR Scan
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        className="d-flex align-items-center justify-content-center bg-dark rounded flex-grow-1"
                        style={{ minHeight: "400px" }}
                      >
                        <div className="text-center text-muted">
                          <FileText size={64} className="mb-3 opacity-50" />
                          <h5 className="mb-2">Ready to Scan</h5>
                          <p className="mb-0">Position OMR sheet and capture</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OMRScanner;
