import { Link } from "react-router-dom";

function HomePage() {
  return (
    <div>
      <h1>Home</h1>

      <nav>
        <ul>
          <li>
            <Link to="/upload">Upload</Link>
          </li>

          <li>
            <Link to="/about">About</Link>
          </li>
          <li>
            <Link to="/admin/login">Admin Login</Link>
          </li>
        </ul>
      </nav>
    </div>
  );
}

export default HomePage;
