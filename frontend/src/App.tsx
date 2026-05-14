import { useEffect, useState } from "react";

function App() {
  const [message, setMessage] = useState("Loading...");

  useEffect(() => {
    fetch("http://localhost:8000")
      .then((res) => {
        console.log("Response:", res);
        return res.json();
      })
      .then((data) => {
        console.log("Data:", data);
        setMessage(data.message);
      })
      .catch((err) => {
        console.error(err);
        setMessage("Failed to connect");
      });
  }, []);

  return <h1>{message}</h1>;
}

export default App;
