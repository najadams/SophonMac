import React from "react";

const NoPage = () => {
  return (
    <div
      className="notlogin"
      style={{
        backgroundColor: "#F8F8FF",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap : 50
      }}>
      <h1 style={{fontSize: 64}}>404</h1>
      <p>Page not found!</p>
    </div>
  );
};

export default NoPage;
