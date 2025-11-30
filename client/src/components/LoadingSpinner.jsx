const LoadingSpinner = ({ size = "md", message }) => {
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-16 w-16",
    lg: "h-24 w-24",
  };

  return (
    <div className="flex flex-col justify-center items-center">
      <div
        className={`animate-spin rounded-full border-t-4 border-b-4 border-white ${sizeClasses[size]} mb-4`}
      ></div>
      {message && (
        <h2 className="text-xl md:text-2xl text-white font-semibold">
          {message}
        </h2>
      )}
    </div>
  );
};

export default LoadingSpinner;
