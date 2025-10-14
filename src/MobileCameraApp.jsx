// import React, { useState, useRef, useEffect, useCallback } from "react";
// import { Camera, Zap, ZapOff, Download, RotateCcw } from "lucide-react";

// // The aspect ratio for a typical OMR sheet (approximating A4 paper)
// const OMR_ASPECT_RATIO = 1 / 1.414; // Height / Width

// const MobileCameraApp = () => {
//   const videoRef = useRef(null);
//   const canvasRef = useRef(null);
//   const previewBoxRef = useRef(null); // Ref for the visible preview box
//   const streamRef = useRef(null);

//   const [capturedImage, setCapturedImage] = useState(null);
//   const [isFlashOn, setIsFlashOn] = useState(false);
//   const [isStreaming, setIsStreaming] = useState(false);
//   const [flashAvailable, setFlashAvailable] = useState(false);
//   const [error, setError] = useState(null);

//   const stopCamera = useCallback(() => {
//     if (streamRef.current) {
//       streamRef.current.getTracks().forEach((track) => track.stop());
//       streamRef.current = null;
//     }
//     if (videoRef.current) videoRef.current.srcObject = null;
//     setIsStreaming(false);
//     setFlashAvailable(false);
//     setIsFlashOn(false);
//   }, []);

//   const startCamera = useCallback(async () => {
//     try {
//       setError(null);
//       stopCamera();
//       await new Promise((r) => setTimeout(r, 300));

//       const constraints = {
//         video: {
//           facingMode: "environment",
//           width: { ideal: 4096 },
//           height: { ideal: 2160 },
//         },
//         audio: false,
//       };

//       const stream = await navigator.mediaDevices.getUserMedia(constraints);
//       streamRef.current = stream;

//       const video = videoRef.current;
//       video.srcObject = stream;
//       video.playsInline = true;
//       video.muted = true;

//       await new Promise((resolve, reject) => {
//         video.onloadedmetadata = async () => {
//           try {
//             await video.play();
//             const track = stream.getVideoTracks()[0];
//             const caps = track.getCapabilities?.() || {};
//             setFlashAvailable(Boolean(caps.torch || caps.fillLightMode));
//             setIsStreaming(true);
//             resolve();
//           } catch (err) {
//             reject(err);
//           }
//         };
//         video.onerror = reject;
//       });
//     } catch (err) {
//       console.error("Camera error:", err);
//       setError("Failed to access camera. Please grant permission.");
//       stopCamera();
//     }
//   }, [stopCamera]);

//   useEffect(() => {
//     startCamera();
//     return () => stopCamera();
//   }, [startCamera, stopCamera]);

//   useEffect(() => {
//     const handleVisibilityChange = () => {
//       if (document.hidden) stopCamera();
//     };
//     document.addEventListener("visibilitychange", handleVisibilityChange);
//     return () =>
//       document.removeEventListener("visibilitychange", handleVisibilityChange);
//   }, [stopCamera]);

//   const toggleFlash = async () => {
//     if (streamRef.current && flashAvailable) {
//       const track = streamRef.current.getVideoTracks()[0];
//       try {
//         await track.applyConstraints({ advanced: [{ torch: !isFlashOn }] });
//         setIsFlashOn(!isFlashOn);
//       } catch (err) {
//         console.error("Flash error:", err);
//         setError("Failed to control flashlight");
//         setTimeout(() => setError(null), 2000);
//       }
//     }
//   };

//   /**
//    * Captures the photo by cropping the video feed to match the visible preview area.
//    * This ensures "What You See Is What You Get" (WYSIWYG).
//    */
//   const capturePhoto = () => {
//     if (!videoRef.current || !previewBoxRef.current || !canvasRef.current || !isStreaming) {
//       setError("Camera not ready");
//       return;
//     }
  
//     const video = videoRef.current;
//     const previewBox = previewBoxRef.current;
//     const canvas = canvasRef.current;
  
//     // Get the dimensions of the full video stream
//     const videoWidth = video.videoWidth;
//     const videoHeight = video.videoHeight;
  
//     // Get the dimensions of the visible preview box on the screen
//     const previewWidth = previewBox.offsetWidth;
//     const previewHeight = previewBox.offsetHeight;
  
//     // Calculate aspect ratios
//     const videoAspectRatio = videoWidth / videoHeight;
//     const previewAspectRatio = previewWidth / previewHeight;
  
//     let sx = 0, sy = 0, sWidth = 0, sHeight = 0;
  
//     // The video is scaled to "cover" the preview box. We need to find the source
//     // rectangle (sx, sy, sWidth, sHeight) from the original video stream that
//     // corresponds to what is visible in the preview box.
//     if (videoAspectRatio > previewAspectRatio) {
//       // Video is wider than the preview box, so it's cropped left and right
//       sHeight = videoHeight;
//       sWidth = videoHeight * previewAspectRatio;
//       sx = (videoWidth - sWidth) / 2;
//       sy = 0;
//     } else {
//       // Video is taller than the preview box, so it's cropped top and bottom
//       sWidth = videoWidth;
//       sHeight = videoWidth / previewAspectRatio;
//       sx = 0;
//       sy = (videoHeight - sHeight) / 2;
//     }
  
//     // Set canvas dimensions to match the source crop for high quality
//     canvas.width = sWidth;
//     canvas.height = sHeight;
  
//     const ctx = canvas.getContext("2d");
    
//     // Draw the calculated portion of the video onto the canvas
//     ctx.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, canvas.width, canvas.height);
    
//     const imageUrl = canvas.toDataURL("image/png");
//     setCapturedImage(imageUrl);
//     if (navigator.vibrate) navigator.vibrate(100);
//   };

//   const downloadImage = () => {
//     if (!capturedImage) return;
//     const link = document.createElement("a");
//     link.download = `omr_sheet_${Date.now()}.png`;
//     link.href = capturedImage;
//     document.body.appendChild(link);
//     link.click();
//     document.body.removeChild(link);
//   };

//   const retakePhoto = async () => {
//     setCapturedImage(null);
//     setError(null);
//     const isStreamActive =
//       streamRef.current &&
//       streamRef.current.active &&
//       streamRef.current.getVideoTracks().length > 0 &&
//       streamRef.current.getVideoTracks()[0].readyState === "live";
//     if (!isStreamActive || videoRef.current.readyState < 2) {
//       stopCamera();
//       await new Promise((r) => setTimeout(r, 300));
//       await startCamera();
//     }
//   };

//   return (
//     <>
//       <div className="camera-app-container">
//         {/* Header */}
//         <div className="camera-header">
//           <h5 className="mb-0 d-flex align-items-center">
//             <Camera size={20} className="me-2" />
//             OMR Scanner
//           </h5>
//         </div>

//         {/* Error */}
//         {error && (
//           <div className="alert alert-danger text-center py-2 m-0 rounded-0">
//             {error}
//           </div>
//         )}

//         {/* Main Area */}
//         {!capturedImage ? (
//           <>
//             <div className="camera-preview-area">
//               <div className="camera-overlay">
//                 <div ref={previewBoxRef} className="omr-preview-box">
//                   <video
//                     ref={videoRef}
//                     autoPlay
//                     playsInline
//                     muted
//                   />
//                 </div>
//               </div>

//               {!isStreaming && (
//                 <div className="loading-indicator">
//                   <div className="spinner-border text-light mb-3" role="status">
//                     <span className="visually-hidden">Loading camera...</span>
//                   </div>
//                   <p className="text-light">Initializing camera...</p>
//                 </div>
//               )}
//             </div>

//             {/* Bottom Controls */}
//             <div className="camera-controls">
//               <button
//                 onClick={toggleFlash}
//                 disabled={!flashAvailable || !isStreaming}
//                 className={`btn ${
//                   isFlashOn ? "btn-warning" : "btn-outline-light"
//                 }`}
//               >
//                 {isFlashOn ? (
//                   <Zap size={24} />
//                 ) : (
//                   <ZapOff size={24} />
//                 )}
//               </button>
//               <button
//                 onClick={capturePhoto}
//                 disabled={!isStreaming}
//                 className="btn btn-light btn-lg capture-button"
//               >
//                 <Camera size={32} />
//               </button>
//               <div style={{width: '48px'}}></div> {/* Spacer */}
//             </div>
//           </>
//         ) : (
//           <>
//             <div className="image-preview-area">
//               <img
//                 src={capturedImage}
//                 alt="Captured OMR Sheet"
//                 className="captured-image"
//               />
//             </div>

//             <div className="captured-controls">
//               <button
//                 onClick={downloadImage}
//                 className="btn btn-primary btn-lg w-100 fw-bold mb-3"
//               >
//                 <Download className="me-2" size={20} />
//                 Download (PNG)
//               </button>
//               <button
//                 onClick={retakePhoto}
//                 className="btn btn-outline-light w-100"
//               >
//                 <RotateCcw className="me-2" size={18} />
//                 Retake
//               </button>
//             </div>
//           </>
//         )}
//         <canvas ref={canvasRef} style={{ display: "none" }} />
//       </div>
//       <style>{`
//         .camera-app-container {
//           background-color: #212529;
//           color: white;
//           height: 100vh;
//           width: 100vw;
//           overflow: hidden;
//           display: flex;
//           flex-direction: column;
//         }
//         .camera-header {
//           background-color: #495057;
//           padding: 0.5rem 1rem;
//           flex-shrink: 0;
//         }
//         .camera-preview-area {
//           flex-grow: 1;
//           position: relative;
//           display: flex;
//           align-items: center;
//           justify-content: center;
//           overflow: hidden;
//           background-color: #000;
//         }
//         .camera-overlay {
//           position: absolute;
//           top: 0;
//           left: 0;
//           width: 100%;
//           height: 100%;
//           display: flex;
//           align-items: center;
//           justify-content: center;
//           /* This shadow creates the dark overlay effect outside the preview box */
//           box-shadow: 0 0 0 50vmax rgba(0,0,0,0.6);
//         }
//         .omr-preview-box {
//           width: 90%;
//           max-width: 500px;
//           border: 2px solid rgba(255, 255, 255, 0.7);
//           border-radius: 8px;
//           overflow: hidden;
//           /* This maintains the OMR aspect ratio */
//           aspect-ratio: ${1 / OMR_ASPECT_RATIO}; 
//         }
//         .omr-preview-box video {
//           width: 100%;
//           height: 100%;
//           object-fit: cover; /* This makes the video fill the box */
//         }
//         .loading-indicator {
//           position: absolute;
//           top: 50%;
//           left: 50%;
//           transform: translate(-50%, -50%);
//           text-align: center;
//           z-index: 10;
//         }
//         .camera-controls {
//           flex-shrink: 0;
//           background-color: #495057;
//           padding: 1.5rem;
//           display: flex;
//           justify-content: space-between;
//           align-items: center;
//         }
//         .capture-button {
//           border-radius: 50%;
//           width: 70px;
//           height: 70px;
//           display: flex;
//           align-items: center;
//           justify-content: center;
//           padding: 0;
//           border: 4px solid #495057;
//           box-shadow: 0 0 0 2px white;
//         }
//         .image-preview-area {
//           flex-grow: 1;
//           display: flex;
//           align-items: center;
//           justify-content: center;
//           background-color: #000;
//           padding: 1rem;
//         }
//         .captured-image {
//           max-width: 100%;
//           max-height: 100%;
//           object-fit: contain;
//         }
//         .captured-controls {
//           flex-shrink: 0;
//           background-color: #495057;
//           padding: 1rem;
//         }
//       `}</style>
//     </>
//   );
// };

// export default MobileCameraApp;
import React, { useState, useRef, useEffect, useCallback } from "react";
import { Camera, Zap, ZapOff, RotateCcw, Download } from "lucide-react";

const OMR_ASPECT_RATIO = 1 / 1.414; // A4 aspect ratio

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
          width: { ideal: 1920 },
          height: { ideal: 1080 },
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
    targetMinKB = 50,
    targetMaxKB = 1024
  ) => {
    const img = await new Promise((resolve) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.src = dataUrl;
    });

    const tempCanvas = document.createElement("canvas");
    const tempCtx = tempCanvas.getContext("2d");

    let quality = 0.92;
    let scale = 1.0;
    let resultDataUrl = dataUrl;
    let iterations = 0;
    const maxIterations = 10;

    while (iterations < maxIterations) {
      const width = Math.floor(img.width * scale);
      const height = Math.floor(img.height * scale);

      tempCanvas.width = width;
      tempCanvas.height = height;
      tempCtx.drawImage(img, 0, 0, width, height);

      resultDataUrl = tempCanvas.toDataURL("image/jpeg", quality);
      const base64Data = resultDataUrl.split(",")[1];
      const sizeKB = Math.ceil((base64Data.length * 3) / 4 / 1024);

      if (sizeKB >= targetMinKB && sizeKB <= targetMaxKB) {
        break;
      }

      if (sizeKB > targetMaxKB) {
        if (sizeKB > targetMaxKB * 2) {
          scale *= 0.8;
        } else {
          quality = Math.max(0.5, quality - 0.1);
        }
      } else if (sizeKB < targetMinKB && quality < 0.95 && scale === 1.0) {
        quality = Math.min(0.95, quality + 0.05);
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

    // Optimize image to 50KB-1MB range
    const optimizedDataUrl = await optimizeImageSize(rawDataUrl);

    setCapturedImage(optimizedDataUrl);
    if (navigator.vibrate) navigator.vibrate(100);
  };

  const downloadImage = () => {
    if (!capturedImage) return;

    const link = document.createElement("a");
    link.href = capturedImage;
    link.download = `omr_scan_${Date.now()}.jpg`;
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
        .camera-app-container { 
          background-color: #212529; 
          color: white; 
          height: 100vh; 
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
          padding: 1.5rem; 
          display: flex; 
          justify-content: space-between; 
          align-items: center;
          box-shadow: 0 -2px 10px rgba(0,0,0,0.3);
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
          padding: 1.5rem; 
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