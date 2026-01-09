import { useEffect } from "react";

const emojiList = [
  "🧑‍🏭",
  "👨🏻‍✈️",
  "👨🏽‍🎓",
  "🤾🏼‍♂️",
  "👨🏿‍💻",
  "⛹️‍♂️",
  "👨‍🍳",
  "👩🏼‍🏫",
  "👩🏾‍🌾",
  "🧗🏽‍♀️",
  "👩‍🎤",
  "👷🏻‍♀️",
];

const FallingEmojiBackground = () => {
  useEffect(() => {
    const interval = setInterval(() => {
      const emoji = document.createElement("div");
      emoji.innerText = emojiList[Math.floor(Math.random() * emojiList.length)];
      emoji.style.position = "fixed";
      emoji.style.left = Math.random() * 100 + "vw";
      emoji.style.top = "-3rem";
      emoji.style.fontSize = "2rem";
      emoji.style.opacity = "0.99";
      emoji.style.pointerEvents = "none";
      emoji.style.animation = "falling 5s linear";
      emoji.style.zIndex = "0"; // 배경에!

      document.body.appendChild(emoji);

      emoji.addEventListener("animationend", () => {
        emoji.remove();
      });
    }, 300);

    return () => clearInterval(interval);
  }, []);

  return null;
};

export default FallingEmojiBackground;
