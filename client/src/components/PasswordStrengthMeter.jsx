import { useEffect, useState } from "react";

const PasswordStrengthMeter = ({ password }) => {
  const [score, setScore] = useState(0);

  useEffect(() => {
    let tempScore = 0;
    if (!password) {
      setScore(0);
      return;
    }

    if (password.length > 5) tempScore += 1;
    if (password.length > 9) tempScore += 1;
    if (/[A-Z]/.test(password)) tempScore += 1;
    if (/[0-9]/.test(password)) tempScore += 1;
    if (/[^A-Za-z0-9]/.test(password)) tempScore += 1;

    setScore(Math.min(tempScore, 4));
  }, [password]);

  const getLabel = () => {
    switch (score) {
      case 0:
        return "ENTER PASSWORD";
      case 1:
        return "WEAK";
      case 2:
        return "FAIR";
      case 3:
        return "GOOD";
      case 4:
        return "STRONG";
      default:
        return "";
    }
  };

  const getColor = (index) => {
    if (index >= score) return "bg-gray-800 border-gray-700";

    switch (score) {
      case 1:
        return "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)] border-red-400";
      case 2:
        return "bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.8)] border-orange-400";
      case 3:
        return "bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.8)] border-yellow-300";
      case 4:
        return "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.8)] border-green-400";
      default:
        return "bg-gray-800 border-gray-700";
    }
  };

  return (
    <div className="w-full mt-3 space-y-2 bg-black/20 p-2 rounded-lg border border-white/5">
      <div className="flex justify-between text-[10px] uppercase font-bold tracking-widest">
        <span className="text-gray-500">Security Level</span>
        <span
          className={
            score >= 4
              ? "text-green-400 drop-shadow-[0_0_5px_rgba(74,222,128,0.5)]"
              : score >= 2
              ? "text-yellow-400"
              : "text-red-400"
          }
        >
          {getLabel()}
        </span>
      </div>
      <div className="flex gap-1.5 h-1.5">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`flex-1 rounded-sm border transition-all duration-300 ${getColor(
              i
            )}`}
          />
        ))}
      </div>
    </div>
  );
};

export default PasswordStrengthMeter;
