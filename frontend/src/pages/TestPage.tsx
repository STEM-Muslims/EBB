import { useEffect, useState } from "react";
import { API_URL } from "../config";

function TestPage() {
  const [message, setMessage] = useState("Loading...");

  useEffect(() => {
    fetch(`${API_URL}/`)
      .then((res) => res.json())
      .then((data) => setMessage(data.message))
      .catch(() => setMessage("Failed to connect"));
  }, []);
  console.log(import.meta.env.VITE_API_URL);
  console.log("hello");

  return (
    <div>
      <h1>Backend Test</h1>
      <p>{message}</p>
    </div>
  );
}

export default TestPage;
