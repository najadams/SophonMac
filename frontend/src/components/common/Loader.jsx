import React from "react";
import "./Loader.css";

const Loader = ({ type = 1 }) => {
  switch (type) {
    case 1:
      return (
        <div className="page">
          <div className="center-body">
            <div className="loader-circle-9">
              Loading
              <span></span>
            </div>
          </div>
        </div>
      );
      case 2:
        return (
          <div className="loader">
            <div className="wrapper">
              <div className="circle"></div>
              <div className="line-1"></div>
              <div className="line-2"></div>
              <div className="line-3"></div>
              <div className="line-4"></div>
            </div>
          </div>
        );
      case 3:
        return (
          <div class="loader3">
            <div class="loader__bar"></div>
            <div class="loader__bar"></div>
            <div class="loader__bar"></div>
            <div class="loader__bar"></div>
            <div class="loader__bar"></div>
            <div class="loader__ball"></div>
          </div>
        );
      default:
      return null; // Return nothing if the type is not recognized
  }
};

export default Loader;
