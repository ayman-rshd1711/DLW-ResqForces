"use client";
import { useRef, useEffect, useState } from "react";
import { IoClose } from "react-icons/io5";

export default function CameraModal({ isOpen, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [capturedImg, setCapturedImg] = useState(null);

  useEffect(() => {
    let stream = null;

    async function startCamera() {
      if (isOpen) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: "environment",
              // Adding these specific dimensions significantly reduces lag
              width: { ideal: 1280 },
              height: { ideal: 720 },
              frameRate: { ideal: 30 }, // Forces a smooth 30fps
            },
          });
          if (videoRef.current) videoRef.current.srcObject = stream;
        } catch (err) {
          console.error("Camera error:", err);
          alert("Could not access camera.");
        }
      }
    }

    startCamera();

    // Cleanup: Stop camera when modal closes
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isOpen]);

  const takePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d").drawImage(video, 0, 0);
      setCapturedImg(canvas.toDataURL("image/png"));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg bg-white rounded-3xl overflow-hidden shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 bg-black/50 p-2 rounded-full text-white"
        >
          <IoClose size={24} />
        </button>

        <div className="p-6 flex flex-col items-center">
          <h3 className="text-xl font-bold mb-4 text-slate-800">
            Emergency Capture
          </h3>

          <div className="relative w-full aspect-video bg-slate-100 rounded-2xl overflow-hidden mb-6 border-4 border-slate-200">
            {capturedImg ? (
              <img
                src={capturedImg}
                alt="Captured"
                className="w-full h-full object-cover"
              />
            ) : (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            )}
          </div>

          <canvas ref={canvasRef} className="hidden" />

          <div className="flex gap-4 w-full">
            {!capturedImg ? (
              <button
                onClick={takePhoto}
                className="flex-1 bg-red-600 text-white py-4 rounded-xl font-bold text-lg active:scale-95 transition-transform"
              >
                TAKE PHOTO
              </button>
            ) : (
              <>
                <button
                  onClick={() => setCapturedImg(null)}
                  className="flex-1 bg-slate-200 text-slate-700 py-4 rounded-xl font-bold"
                >
                  RETAKE
                </button>
                <button
                  onClick={() => {
                    alert("Photo Sent!");
                    onClose();
                  }}
                  className="flex-1 bg-blue-600 text-white py-4 rounded-xl font-bold"
                >
                  SEND REPORT
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
