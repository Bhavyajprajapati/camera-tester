import { useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";
import CameraQualityTester from "./CameraQualityTester";

function App() {
  const [count, setCount] = useState(0);

  return (
    <>
      <CameraQualityTester />
    </>
  );
}

export default App;
