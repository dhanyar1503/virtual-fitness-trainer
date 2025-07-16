import React, { useRef, useEffect, useState } from "react";
import Webcam from "react-webcam";
import { Pose } from "@mediapipe/pose";
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";
import { Camera } from "@mediapipe/camera_utils";

const WebcamFeed = () => {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);

  const repsRef = useRef(0);
  const positionRef = useRef("up");
  const [workoutStarted, setWorkoutStarted] = useState(false);

  // ✅ Angle calculation helper
  function calculateAngle(a, b, c) {
    const radians =
      Math.atan2(c.y - b.y, c.x - b.x) -
      Math.atan2(a.y - b.y, a.x - b.x);
    let angle = (radians * 180.0) / Math.PI;
    if (angle < 0) angle += 360;
    return Math.round(angle);
  }

  useEffect(() => {
    if (!workoutStarted) return; // Wait until button is clicked

    const pose = new Pose({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
    });

    pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    pose.onResults((results) => {
      if (!canvasRef.current || !webcamRef.current) return;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      canvas.width = webcamRef.current.video.videoWidth;
      canvas.height = webcamRef.current.video.videoHeight;

      ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

      if (results.poseLandmarks) {
        const landmarks = results.poseLandmarks;

        const leftHip = landmarks[23];
        const leftKnee = landmarks[25];
        const leftAnkle = landmarks[27];

        const kneeAngle = calculateAngle(leftHip, leftKnee, leftAnkle);
        console.log("Knee Angle:", kneeAngle);

        if (kneeAngle < 90 && positionRef.current === "up") {
          positionRef.current = "down";
        } else if (kneeAngle > 160 && positionRef.current === "down") {
          positionRef.current = "up";
          repsRef.current += 1;
        }

        let feedbackText = "";
        if (kneeAngle > 160) {
          feedbackText = "Stand Up";
        } else if (kneeAngle < 90) {
          feedbackText = "Good Squat!";
        } else {
          feedbackText = "Go Lower";
        }

        ctx.fillStyle = feedbackText === "Good Squat!" ? "green" : "red";
        ctx.font = "24px Arial";
        ctx.fillText(feedbackText, 10, 30);

        ctx.fillStyle = "blue";
        ctx.font = "20px Arial";
        ctx.fillText(`Reps: ${repsRef.current}`, 10, 60);

        drawConnectors(ctx, landmarks, Pose.POSE_CONNECTIONS, {
          color: "#00FF00",
          lineWidth: 4,
        });
        drawLandmarks(ctx, landmarks, {
          color: "#FF0000",
          lineWidth: 2,
        });
      }
    });

    const runPose = async () => {
      if (
        typeof webcamRef.current !== "undefined" &&
        webcamRef.current !== null
      ) {
        const camera = new Camera(webcamRef.current.video, {
          onFrame: async () => {
            await pose.send({ image: webcamRef.current.video });
          },
          width: 640,
          height: 480,
        });
        camera.start();
      }
    };

    runPose();
  }, [workoutStarted]); // 👈 Add workoutStarted as dependency

  const handleStart = () => {
    setWorkoutStarted(true);
  };

  return (
    <div style={{ textAlign: "center", marginTop: "20px" }}>
      {!workoutStarted && (
        <button
          onClick={handleStart}
          style={{
            padding: "10px 20px",
            fontSize: "18px",
            backgroundColor: "#00b894",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          Start Workout
        </button>
      )}

      {workoutStarted && (
        <div
          style={{
            position: "relative",
            width: 640,
            height: 480,
            margin: "auto",
          }}
        >
          <Webcam
            ref={webcamRef}
            audio={false}
            style={{
              position: "absolute",
              width: 640,
              height: 480,
              transform: "scaleX(-1)",
              zIndex: 1,
            }}
          />
          <canvas
            ref={canvasRef}
            style={{
              position: "absolute",
              width: 640,
              height: 480,
              zIndex: 2,
            }}
          />
        </div>
      )}
    </div>
  );
};

export default WebcamFeed;
