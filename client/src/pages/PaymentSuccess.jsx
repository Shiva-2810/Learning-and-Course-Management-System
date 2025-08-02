import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle } from "lucide-react";

const PaymentSuccess = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");

    if (!sessionId) {
      navigate("/"); // redirect if session_id is missing
    }

    // You can fetch the session status here if needed
  }, []);

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-green-100 via-white to-white px-4">
      <CheckCircle className="text-green-500 w-20 h-20 animate-bounce mb-6" />
      <h1 className="text-4xl font-bold text-green-600 mb-4">Payment Successful!</h1>
      <p className="text-lg text-gray-700 text-center max-w-md mb-6">
        Thank you for your purchase. Your course is now unlocked and added to your dashboard. Start learning right away!
      </p>
      <button
        onClick={() => navigate("/")}
        className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-xl shadow-md transition-all"
      >
        Go to My Learning
      </button>
    </div>
  );
};

export default PaymentSuccess;
