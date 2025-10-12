import React from "react";
import "../style/mainPage.css";

function MainPage() {
  return (
    <div className="main-container">
      <h1 className="main-title">Welcome to My Landing Page</h1>
      <p className="main-description">This is your main landing page.</p>
      <button
        className="main-button"
        onClick={() => alert("Welcome to the main page!")}
      >
        Get Started
      </button>
    </div>
  );
}

export default MainPage;
