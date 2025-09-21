// import React, { useState, useRef, useEffect } from "react";
// import {
//   Camera,
//   Download,
//   Grid3X3,
//   Zap,
//   ZapOff,
//   RotateCcw,
//   Settings,
// } from "lucide-react";

// const CameraQualityTester = () => {
//   const videoRef = useRef(null);
//   const canvasRef = useRef(null);
//   const [stream, setStream] = useState(null);
//   const [capturedImage, setCapturedImage] = useState(null);
//   const [isFlashOn, setIsFlashOn] = useState(false);
//   const [showGrid, setShowGrid] = useState(false);
//   const [facingMode, setFacingMode] = useState("environment");
//   const [resolution, setResolution] = useState({ width: 1920, height: 1080 });
//   const [isStreaming, setIsStreaming] = useState(false);
//   const [error, setError] = useState(null);
//   const [devices, setDevices] = useState([]);

//   // Get available camera devices
//   useEffect(() => {
//     const getDevices = async () => {
//       try {
//         const deviceList = await navigator.mediaDevices.enumerateDevices();
//         const videoDevices = deviceList.filter(
//           (device) => device.kind === "videoinput"
//         );
//         setDevices(videoDevices);
//       } catch (err) {
//         console.error("Error getting devices:", err);
//       }
//     };
//     getDevices();
//   }, []);

//   const startCamera = async () => {
//     try {
//       setError(null);

//       // Stop existing stream
//       if (stream) {
//         stream.getTracks().forEach((track) => track.stop());
//       }

//       const constraints = {
//         video: {
//           facingMode: facingMode,
//           width: { ideal: resolution.width },
//           height: { ideal: resolution.height },
//           frameRate: { ideal: 30 },
//         },
//         audio: false,
//       };

//       const mediaStream = await navigator.mediaDevices.getUserMedia(
//         constraints
//       );

//       if (videoRef.current) {
//         videoRef.current.srcObject = mediaStream;
//         await videoRef.current.play();
//       }

//       setStream(mediaStream);
//       setIsStreaming(true);
//     } catch (err) {
//       setError(`Camera error: ${err.message}`);
//       console.error("Error accessing camera:", err);
//     }
//   };

//   const stopCamera = () => {
//     if (stream) {
//       stream.getTracks().forEach((track) => track.stop());
//       setStream(null);
//       setIsStreaming(false);
//     }
//     if (videoRef.current) {
//       videoRef.current.srcObject = null;
//     }
//   };

//   const toggleFlash = async () => {
//     if (stream) {
//       const track = stream.getVideoTracks()[0];
//       if (track && track.getCapabilities && track.applyConstraints) {
//         try {
//           const capabilities = track.getCapabilities();
//           if (capabilities.torch) {
//             await track.applyConstraints({
//               advanced: [{ torch: !isFlashOn }],
//             });
//             setIsFlashOn(!isFlashOn);
//           } else {
//             setError("Flash/torch not supported on this device");
//           }
//         } catch (err) {
//           setError("Flash control not available");
//         }
//       }
//     }
//   };

//   const captureImage = () => {
//     if (videoRef.current && canvasRef.current) {
//       const canvas = canvasRef.current;
//       const video = videoRef.current;

//       canvas.width = video.videoWidth;
//       canvas.height = video.videoHeight;

//       const ctx = canvas.getContext("2d");
//       ctx.drawImage(video, 0, 0);

//       const imageDataUrl = canvas.toDataURL("image/jpeg", 0.9);
//       setCapturedImage({
//         url: imageDataUrl,
//         width: canvas.width,
//         height: canvas.height,
//         timestamp: new Date().toISOString(),
//       });
//     }
//   };

//   const downloadImage = () => {
//     if (capturedImage) {
//       const link = document.createElement("a");
//       link.download = `camera-test-${Date.now()}.jpg`;
//       link.href = capturedImage.url;
//       link.click();
//     }
//   };

//   const switchCamera = () => {
//     const newFacingMode = facingMode === "environment" ? "user" : "environment";
//     setFacingMode(newFacingMode);
//     if (isStreaming) {
//       startCamera();
//     }
//   };

//   const GridOverlay = () => (
//     <div className="absolute inset-0 pointer-events-none">
//       {/* Horizontal lines */}
//       <div className="absolute top-1/3 left-0 right-0 h-px bg-white opacity-50"></div>
//       <div className="absolute top-2/3 left-0 right-0 h-px bg-white opacity-50"></div>
//       {/* Vertical lines */}
//       <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white opacity-50"></div>
//       <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white opacity-50"></div>
//     </div>
//   );

//   return (
//     <div className="min-h-screen bg-gray-900 text-white p-4">
//       <div className="max-w-6xl mx-auto">
//         <h1 className="text-3xl font-bold text-center mb-8">
//           Camera Quality Tester
//         </h1>

//         {error && (
//           <div className="bg-red-600 text-white p-4 rounded-lg mb-4">
//             {error}
//           </div>
//         )}

//         <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
//           {/* Camera Section */}
//           <div className="bg-gray-800 rounded-lg p-6">
//             <h2 className="text-xl font-semibold mb-4">Live Camera Feed</h2>

//             {/* Controls */}
//             <div className="flex flex-wrap gap-2 mb-4">
//               <button
//                 onClick={isStreaming ? stopCamera : startCamera}
//                 className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
//                   isStreaming
//                     ? "bg-red-600 hover:bg-red-700"
//                     : "bg-green-600 hover:bg-green-700"
//                 } transition-colors`}
//               >
//                 <Camera size={20} />
//                 {isStreaming ? "Stop" : "Start"} Camera
//               </button>

//               <button
//                 onClick={switchCamera}
//                 className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
//                 disabled={!isStreaming}
//               >
//                 <RotateCcw size={20} />
//                 Switch
//               </button>

//               <button
//                 onClick={toggleFlash}
//                 className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
//                   isFlashOn
//                     ? "bg-yellow-600 hover:bg-yellow-700"
//                     : "bg-gray-600 hover:bg-gray-700"
//                 }`}
//                 disabled={!isStreaming}
//               >
//                 {isFlashOn ? <Zap size={20} /> : <ZapOff size={20} />}
//                 Flash
//               </button>

//               <button
//                 onClick={() => setShowGrid(!showGrid)}
//                 className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
//                   showGrid
//                     ? "bg-purple-600 hover:bg-purple-700"
//                     : "bg-gray-600 hover:bg-gray-700"
//                 }`}
//               >
//                 <Grid3X3 size={20} />
//                 Grid
//               </button>
//             </div>

//             {/* Resolution Settings */}
//             <div className="mb-4">
//               <label className="block text-sm font-medium mb-2">
//                 Resolution:
//               </label>
//               <select
//                 value={`${resolution.width}x${resolution.height}`}
//                 onChange={(e) => {
//                   const [width, height] = e.target.value.split("x").map(Number);
//                   setResolution({ width, height });
//                 }}
//                 className="bg-gray-700 text-white p-2 rounded border border-gray-600"
//               >
//                 <option value="640x480">640x480 (VGA)</option>
//                 <option value="1280x720">1280x720 (HD)</option>
//                 <option value="1920x1080">1920x1080 (Full HD)</option>
//                 <option value="3840x2160">3840x2160 (4K)</option>
//               </select>
//             </div>

//             {/* Camera Preview */}
//             <div className="relative bg-black rounded-lg overflow-hidden aspect-video mb-4">
//               <video
//                 ref={videoRef}
//                 autoPlay
//                 playsInline
//                 muted
//                 className="w-full h-full object-cover"
//                 style={{ display: isStreaming ? "block" : "none" }}
//               />
//               {showGrid && isStreaming && <GridOverlay />}
//               {!isStreaming && (
//                 <div className="absolute inset-0 flex items-center justify-center text-gray-400">
//                   <div className="text-center">
//                     <Camera size={48} className="mx-auto mb-2" />
//                     <p>Camera not active</p>
//                   </div>
//                 </div>
//               )}
//             </div>

//             {/* Capture Button */}
//             <button
//               onClick={captureImage}
//               disabled={!isStreaming}
//               className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 px-6 py-3 rounded-lg font-semibold transition-colors"
//             >
//               📸 Capture Photo
//             </button>

//             {/* Hidden canvas for image capture */}
//             <canvas ref={canvasRef} style={{ display: "none" }} />
//           </div>

//           {/* Image Preview Section */}
//           <div className="bg-gray-800 rounded-lg p-6">
//             <h2 className="text-xl font-semibold mb-4">Captured Image</h2>

//             {capturedImage ? (
//               <div>
//                 <div className="bg-black rounded-lg overflow-hidden mb-4">
//                   <img
//                     src={capturedImage.url}
//                     alt="Captured"
//                     className="w-full h-auto max-h-96 object-contain"
//                   />
//                 </div>

//                 {/* Image Info */}
//                 <div className="bg-gray-700 p-4 rounded-lg mb-4 text-sm">
//                   <h3 className="font-semibold mb-2">Image Information:</h3>
//                   <div className="space-y-1">
//                     <p>
//                       <span className="text-gray-300">Resolution:</span>{" "}
//                       {capturedImage.width}x{capturedImage.height}
//                     </p>
//                     <p>
//                       <span className="text-gray-300">Aspect Ratio:</span>{" "}
//                       {(capturedImage.width / capturedImage.height).toFixed(2)}
//                     </p>
//                     <p>
//                       <span className="text-gray-300">Megapixels:</span>{" "}
//                       {(
//                         (capturedImage.width * capturedImage.height) /
//                         1000000
//                       ).toFixed(1)}
//                       MP
//                     </p>
//                     <p>
//                       <span className="text-gray-300">Timestamp:</span>{" "}
//                       {new Date(capturedImage.timestamp).toLocaleString()}
//                     </p>
//                   </div>
//                 </div>

//                 <button
//                   onClick={downloadImage}
//                   className="w-full bg-green-600 hover:bg-green-700 px-6 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
//                 >
//                   <Download size={20} />
//                   Download Image
//                 </button>
//               </div>
//             ) : (
//               <div className="bg-gray-700 rounded-lg h-64 flex items-center justify-center text-gray-400">
//                 <div className="text-center">
//                   <Settings size={48} className="mx-auto mb-2" />
//                   <p>No image captured yet</p>
//                   <p className="text-sm mt-1">
//                     Capture a photo to see preview and details
//                   </p>
//                 </div>
//               </div>
//             )}
//           </div>
//         </div>

//         {/* Camera Information */}
//         <div className="mt-8 bg-gray-800 rounded-lg p-6">
//           <h2 className="text-xl font-semibold mb-4">Testing Features</h2>
//           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
//             <div className="bg-gray-700 p-4 rounded-lg">
//               <h3 className="font-semibold text-green-400 mb-2">
//                 ✓ Camera Quality
//               </h3>
//               <p>Test different resolutions and see actual image quality</p>
//             </div>
//             <div className="bg-gray-700 p-4 rounded-lg">
//               <h3 className="font-semibold text-blue-400 mb-2">
//                 ✓ Flash Control
//               </h3>
//               <p>Toggle flashlight/torch for better lighting conditions</p>
//             </div>
//             <div className="bg-gray-700 p-4 rounded-lg">
//               <h3 className="font-semibold text-purple-400 mb-2">
//                 ✓ Grid Overlay
//               </h3>
//               <p>Rule of thirds grid for better photo composition</p>
//             </div>
//             <div className="bg-gray-700 p-4 rounded-lg">
//               <h3 className="font-semibold text-orange-400 mb-2">
//                 ✓ Camera Switch
//               </h3>
//               <p>Toggle between front and rear cameras</p>
//             </div>
//           </div>
//         </div>

//         {/* Instructions */}
//         <div className="mt-6 bg-blue-900 bg-opacity-50 border border-blue-600 rounded-lg p-4">
//           <h3 className="font-semibold mb-2">📋 How to Use:</h3>
//           <ol className="text-sm space-y-1 list-decimal list-inside">
//             <li>Click "Start Camera" to begin testing</li>
//             <li>Adjust resolution settings to test different quality levels</li>
//             <li>Toggle grid overlay for composition assistance</li>
//             <li>Use flash control if your device supports it</li>
//             <li>Switch between front/rear cameras to test both</li>
//             <li>Capture photos to see actual image quality and details</li>
//             <li>Download captured images for further analysis</li>
//           </ol>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default CameraQualityTester;
import React, { useState, useRef, useEffect } from "react";
import {
  Camera,
  Download,
  Grid3X3,
  Zap,
  ZapOff,
  RotateCcw,
  Settings,
} from "lucide-react";
import "bootstrap/dist/css/bootstrap.min.css";

const CameraQualityTester = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [facingMode, setFacingMode] = useState("environment");
  const [resolution, setResolution] = useState({ width: 1920, height: 1080 });
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);
  const [devices, setDevices] = useState([]);

  // Get available camera devices
  useEffect(() => {
    const getDevices = async () => {
      try {
        const deviceList = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = deviceList.filter(
          (device) => device.kind === "videoinput"
        );
        setDevices(videoDevices);
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

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0);

      const imageDataUrl = canvas.toDataURL("image/jpeg", 0.9);
      setCapturedImage({
        url: imageDataUrl,
        width: canvas.width,
        height: canvas.height,
        timestamp: new Date().toISOString(),
      });
    }
  };

  const downloadImage = () => {
    if (capturedImage) {
      const link = document.createElement("a");
      link.download = `camera-test-${Date.now()}.jpg`;
      link.href = capturedImage.url;
      link.click();
    }
  };

  const switchCamera = () => {
    const newFacingMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(newFacingMode);
    if (isStreaming) startCamera();
  };

  const GridOverlay = () => (
    <div className="position-absolute top-0 start-0 w-100 h-100 pointer-events-none">
      <div className="position-absolute top-33 start-0 w-100 border-top border-light opacity-50"></div>
      <div className="position-absolute top-66 start-0 w-100 border-top border-light opacity-50"></div>
      <div className="position-absolute top-0 start-33 h-100 border-start border-light opacity-50"></div>
      <div className="position-absolute top-0 start-66 h-100 border-start border-light opacity-50"></div>
    </div>
  );

  return (
    <div className="container py-4 bg-dark text-white min-vh-100">
      <h1 className="text-center mb-4">Camera Quality Tester</h1>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="row g-4">
        {/* Camera Section */}
        <div className="col-lg-6">
          <div className="card bg-secondary text-white">
            <div className="card-body">
              <h5 className="card-title">Live Camera Feed</h5>

              <div className="mb-3 d-flex flex-wrap gap-2">
                <button
                  onClick={isStreaming ? stopCamera : startCamera}
                  className={`btn ${
                    isStreaming ? "btn-danger" : "btn-success"
                  }`}
                >
                  <Camera size={18} /> {isStreaming ? "Stop" : "Start"} Camera
                </button>

                <button
                  onClick={switchCamera}
                  className="btn btn-primary"
                  disabled={!isStreaming}
                >
                  <RotateCcw size={18} /> Switch
                </button>

                <button
                  onClick={toggleFlash}
                  className={`btn ${
                    isFlashOn ? "btn-warning" : "btn-secondary"
                  }`}
                  disabled={!isStreaming}
                >
                  {isFlashOn ? <Zap size={18} /> : <ZapOff size={18} />} Flash
                </button>

                <button
                  onClick={() => setShowGrid(!showGrid)}
                  className={`btn ${showGrid ? "btn-info" : "btn-secondary"}`}
                >
                  <Grid3X3 size={18} /> Grid
                </button>
              </div>

              <div className="mb-3">
                <label className="form-label">Resolution:</label>
                <select
                  value={`${resolution.width}x${resolution.height}`}
                  onChange={(e) => {
                    const [width, height] = e.target.value
                      .split("x")
                      .map(Number);
                    setResolution({ width, height });
                  }}
                  className="form-select"
                >
                  <option value="640x480">640x480 (VGA)</option>
                  <option value="1280x720">1280x720 (HD)</option>
                  <option value="1920x1080">1920x1080 (Full HD)</option>
                  <option value="3840x2160">3840x2160 (4K)</option>
                </select>
              </div>

              <div
                className="position-relative bg-black mb-3"
                style={{ aspectRatio: "16/9" }}
              >
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-100 h-100 object-fit-cover"
                  style={{ display: isStreaming ? "block" : "none" }}
                />
                {showGrid && isStreaming && <GridOverlay />}
                {!isStreaming && (
                  <div className="position-absolute top-50 start-50 translate-middle text-center text-secondary">
                    <Camera size={48} className="mb-2" />
                    <div>Camera not active</div>
                  </div>
                )}
              </div>

              <button
                onClick={captureImage}
                disabled={!isStreaming}
                className="btn btn-indigo w-100"
                style={{ backgroundColor: "#6610f2" }}
              >
                📸 Capture Photo
              </button>
              <canvas ref={canvasRef} style={{ display: "none" }} />
            </div>
          </div>
        </div>

        {/* Captured Image Section */}
        <div className="col-lg-6">
          <div className="card bg-secondary text-white">
            <div className="card-body">
              <h5 className="card-title">Captured Image</h5>

              {capturedImage ? (
                <>
                  <div className="bg-black overflow-hidden mb-3 text-center">
                    <img
                      src={capturedImage.url}
                      alt="Captured"
                      className="img-fluid"
                    />
                  </div>
                  <div className="bg-dark p-2 mb-3">
                    <p className="mb-1">
                      Resolution: {capturedImage.width}x{capturedImage.height}
                    </p>
                    <p className="mb-1">
                      Aspect Ratio:{" "}
                      {(capturedImage.width / capturedImage.height).toFixed(2)}
                    </p>
                    <p className="mb-1">
                      Megapixels:{" "}
                      {(
                        (capturedImage.width * capturedImage.height) /
                        1000000
                      ).toFixed(1)}
                      MP
                    </p>
                    <p className="mb-0">
                      Timestamp:{" "}
                      {new Date(capturedImage.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={downloadImage}
                    className="btn btn-success w-100 d-flex justify-content-center align-items-center gap-2"
                  >
                    <Download size={18} /> Download Image
                  </button>
                </>
              ) : (
                <div
                  className="bg-dark d-flex align-items-center justify-content-center"
                  style={{ height: "16rem" }}
                >
                  <div className="text-center text-secondary">
                    <Settings size={48} className="mb-2" />
                    <div>No image captured yet</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CameraQualityTester;
