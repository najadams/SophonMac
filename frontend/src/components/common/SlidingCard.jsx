import React, { useState } from "react";
import { Card, CardContent, Button } from "@mui/material";
import { CSSTransition, TransitionGroup } from "react-transition-group";

const contents = ["Content 1", "Content 2", "Content 3"]; // Your contents

function SlidingCard() {
  const [index, setIndex] = useState(0);

  const handleNext = () => {
    setIndex((prevIndex) => (prevIndex + 1) % contents.length);
  };

  const handlePrev = () => {
    setIndex(
      (prevIndex) => (prevIndex - 1 + contents.length) % contents.length
    );
  };

  return (
    <div>
      <Button onClick={handlePrev}>Previous</Button>
      <Button onClick={handleNext}>Next</Button>
      <Card>
        <TransitionGroup>
          <CSSTransition key={index} timeout={500} classNames="slide">
            <CardContent style={{ color: '#ff6347'}}>{contents[index]}</CardContent>
          </CSSTransition>
        </TransitionGroup>
      </Card>
    </div>
  );
}

export default SlidingCard;
